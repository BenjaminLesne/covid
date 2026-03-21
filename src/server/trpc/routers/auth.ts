import { z } from "zod";
import { router, publicProcedure } from "../init";
import { db } from "@/server/db";
import { usersTable, sessionsTable } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { hash, compare } from "bcryptjs";
import { randomUUID } from "crypto";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const authRouter = router({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const passwordHash = await hash(input.password, 10);

      const [user] = await db
        .insert(usersTable)
        .values({ email: input.email, password_hash: passwordHash })
        .returning({ id: usersTable.id, email: usersTable.email });

      const token = randomUUID();
      const expiresAt = new Date(Date.now() + THIRTY_DAYS_MS);

      await db.insert(sessionsTable).values({
        user_id: user.id,
        token,
        expires_at: expiresAt,
      });

      ctx.cookieStore.set("session_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: expiresAt,
      });

      return { id: user.id, email: user.email };
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, input.email))
        .limit(1);

      if (!user) {
        throw new Error("Invalid email or password");
      }

      const valid = await compare(input.password, user.password_hash);
      if (!valid) {
        throw new Error("Invalid email or password");
      }

      const token = randomUUID();
      const expiresAt = new Date(Date.now() + THIRTY_DAYS_MS);

      await db.insert(sessionsTable).values({
        user_id: user.id,
        token,
        expires_at: expiresAt,
      });

      ctx.cookieStore.set("session_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: expiresAt,
      });

      return { id: user.id, email: user.email };
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    const token = ctx.cookieStore.get("session_token")?.value;
    if (token) {
      await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
      ctx.cookieStore.delete("session_token");
    }
    return { success: true };
  }),

  me: publicProcedure.query(async ({ ctx }) => {
    const token = ctx.cookieStore.get("session_token")?.value;
    if (!token) return null;

    const [session] = await db
      .select({ userId: sessionsTable.user_id, expiresAt: sessionsTable.expires_at })
      .from(sessionsTable)
      .where(eq(sessionsTable.token, token))
      .limit(1);

    if (!session || session.expiresAt < new Date()) return null;

    const [user] = await db
      .select({ id: usersTable.id, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, session.userId))
      .limit(1);

    return user ?? null;
  }),
});
