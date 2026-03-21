import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/server/db";
import { sicknessEpisodesTable } from "@/server/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const sicknessRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const episodes = await db
      .select()
      .from(sicknessEpisodesTable)
      .where(eq(sicknessEpisodesTable.user_id, ctx.user.id))
      .orderBy(desc(sicknessEpisodesTable.start_date));

    return episodes.map((e) => ({
      id: e.id,
      startDate: e.start_date,
      endDate: e.end_date,
      createdAt: e.created_at,
    }));
  }),

  create: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (input.startDate > input.endDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Start date must be before or equal to end date",
        });
      }

      const [episode] = await db
        .insert(sicknessEpisodesTable)
        .values({
          user_id: ctx.user.id,
          start_date: input.startDate,
          end_date: input.endDate,
        })
        .returning();

      return {
        id: episode.id,
        startDate: episode.start_date,
        endDate: episode.end_date,
        createdAt: episode.created_at,
      };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const [episode] = await db
        .select()
        .from(sicknessEpisodesTable)
        .where(
          and(
            eq(sicknessEpisodesTable.id, input.id),
            eq(sicknessEpisodesTable.user_id, ctx.user.id),
          ),
        )
        .limit(1);

      if (!episode) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Episode not found",
        });
      }

      await db
        .delete(sicknessEpisodesTable)
        .where(eq(sicknessEpisodesTable.id, input.id));

      return { success: true };
    }),
});
