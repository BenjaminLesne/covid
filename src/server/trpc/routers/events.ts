import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/server/db";
import { eventsTable } from "@/server/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { CATEGORY_KEYS } from "@/lib/event-categories";

const categoryEnum = z.enum(CATEGORY_KEYS as [string, ...string[]]);

export const eventsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const events = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.user_id, ctx.user.id))
      .orderBy(desc(eventsTable.date));

    return events.map((e) => ({
      id: e.id,
      category: e.category,
      name: e.name,
      date: e.date,
      endDate: e.end_date,
      createdAt: e.created_at,
    }));
  }),

  create: protectedProcedure
    .input(
      z.object({
        category: categoryEnum,
        name: z.string().optional(),
        date: z.string(),
        endDate: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (input.endDate && input.endDate < input.date) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End date must be after or equal to start date",
        });
      }

      const [event] = await db
        .insert(eventsTable)
        .values({
          user_id: ctx.user.id,
          category: input.category,
          name: input.name ?? null,
          date: input.date,
          end_date: input.endDate ?? null,
        })
        .returning();

      return {
        id: event.id,
        category: event.category,
        name: event.name,
        date: event.date,
        endDate: event.end_date,
        createdAt: event.created_at,
      };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        category: categoryEnum,
        name: z.string().optional(),
        date: z.string(),
        endDate: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (input.endDate && input.endDate < input.date) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End date must be after or equal to start date",
        });
      }

      const [existing] = await db
        .select()
        .from(eventsTable)
        .where(
          and(
            eq(eventsTable.id, input.id),
            eq(eventsTable.user_id, ctx.user.id),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      const [updated] = await db
        .update(eventsTable)
        .set({
          category: input.category,
          name: input.name ?? null,
          date: input.date,
          end_date: input.endDate ?? null,
        })
        .where(eq(eventsTable.id, input.id))
        .returning();

      return {
        id: updated.id,
        category: updated.category,
        name: updated.name,
        date: updated.date,
        endDate: updated.end_date,
        createdAt: updated.created_at,
      };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const [existing] = await db
        .select()
        .from(eventsTable)
        .where(
          and(
            eq(eventsTable.id, input.id),
            eq(eventsTable.user_id, ctx.user.id),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      await db.delete(eventsTable).where(eq(eventsTable.id, input.id));

      return { success: true };
    }),
});
