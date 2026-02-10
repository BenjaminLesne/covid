import { z } from "zod";
import { router, publicProcedure } from "../init";
import { db } from "@/server/db";
import { clinicalIndicatorsTable } from "@/server/db/schema";
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import type { ClinicalDiseaseId } from "@/types/clinical";
import { CLINICAL_DISEASE_IDS } from "@/lib/constants";

/** Zod enum for clinical disease IDs. */
const clinicalDiseaseIdEnum = z.enum(
  CLINICAL_DISEASE_IDS as unknown as [string, ...string[]]
);

export const clinicalRouter = router({
  /**
   * Get clinical indicators, optionally filtered by disease IDs and date range.
   */
  getIndicators: publicProcedure
    .input(
      z
        .object({
          diseaseIds: z.array(clinicalDiseaseIdEnum).optional(),
          department: z.string().optional(),
          dateRange: z
            .object({
              from: z.string(),
              to: z.string(),
            })
            .optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const conditions = [];

      // Filter by disease IDs if provided
      if (input?.diseaseIds && input.diseaseIds.length > 0) {
        conditions.push(
          inArray(clinicalIndicatorsTable.disease_id, input.diseaseIds)
        );
      }

      // Filter by department — use sentinel 'national' for national-level data
      if (input?.department) {
        conditions.push(
          eq(clinicalIndicatorsTable.department, input.department)
        );
      } else {
        conditions.push(
          eq(clinicalIndicatorsTable.department, "national")
        );
      }

      // Filter by date range (lexicographic ISO week comparison)
      if (input?.dateRange) {
        conditions.push(
          gte(clinicalIndicatorsTable.week, input.dateRange.from)
        );
        conditions.push(
          lte(clinicalIndicatorsTable.week, input.dateRange.to)
        );
      }

      const rows = await db
        .select()
        .from(clinicalIndicatorsTable)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(clinicalIndicatorsTable.week));

      return rows.map((row) => ({
        week: row.week,
        diseaseId: row.disease_id as ClinicalDiseaseId,
        erVisitRate: row.er_visit_rate,
      }));
    }),
});
