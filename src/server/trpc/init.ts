import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { cookies } from "next/headers";
import { db } from "@/server/db";
import { sessionsTable, usersTable } from "@/server/db/schema";
import { and, eq, gt } from "drizzle-orm";

export async function createContext() {
  const cookieStore = await cookies();
  return { cookieStore };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const token = ctx.cookieStore.get("session_token")?.value;
  if (!token) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const [session] = await db
    .select({ userId: sessionsTable.user_id })
    .from(sessionsTable)
    .where(and(eq(sessionsTable.token, token), gt(sessionsTable.expires_at, new Date())))
    .limit(1);

  if (!session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const [user] = await db
    .select({ id: usersTable.id, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, session.userId))
    .limit(1);

  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({ ctx: { ...ctx, user } });
});
