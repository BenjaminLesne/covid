import { z } from "zod";
import { router, publicProcedure } from "../init";
import { db } from "@/server/db";
import { rougeoleIndicatorsTable } from "@/server/db/schema";
import { asc, eq } from "drizzle-orm";

export const rougeoleRouter = router({
  /**
   * Get rougeole indicators, optionally filtered by department.
   * Defaults to national-level data.
   */
  getIndicators: publicProcedure
    .input(
      z
        .object({
          department: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const department = input?.department ?? "national";

      const rows = await db
        .select()
        .from(rougeoleIndicatorsTable)
        .where(eq(rougeoleIndicatorsTable.department, department))
        .orderBy(asc(rougeoleIndicatorsTable.year));

      return rows.map((row) => ({
        year: row.year,
        notificationRate: row.notification_rate,
        cases: row.cases,
      }));
    }),
});
