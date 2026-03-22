import { z } from "zod";
import { router, publicProcedure } from "../init";
import { db } from "@/server/db";
import {
  wastewaterIndicatorsTable,
  clinicalIndicatorsTable,
} from "@/server/db/schema";
import { and, asc, eq, lte } from "drizzle-orm";
import { NATIONAL_COLUMN } from "@/lib/constants";
import type { ClinicalDiseaseId } from "@/types/clinical";

export const timeMachineRouter = router({
  getSnapshot: publicProcedure
    .input(
      z.object({
        asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
    )
    .query(async ({ input }) => {
      const asOf = new Date(input.asOfDate + "T23:59:59Z");

      const wastewaterRows = await db
        .select()
        .from(wastewaterIndicatorsTable)
        .where(
          and(
            eq(wastewaterIndicatorsTable.station_id, NATIONAL_COLUMN),
            lte(wastewaterIndicatorsTable.first_seen_at, asOf),
          )
        )
        .orderBy(asc(wastewaterIndicatorsTable.week));

      const clinicalRows = await db
        .select()
        .from(clinicalIndicatorsTable)
        .where(
          and(
            eq(clinicalIndicatorsTable.department, "national"),
            lte(clinicalIndicatorsTable.first_seen_at, asOf),
          )
        )
        .orderBy(asc(clinicalIndicatorsTable.week));

      return {
        wastewater: wastewaterRows.map((row) => ({
          week: row.week,
          stationId: row.station_id,
          value: row.value,
          smoothedValue: row.smoothed_value,
        })),
        clinical: clinicalRows.map((row) => ({
          week: row.week,
          diseaseId: row.disease_id as ClinicalDiseaseId,
          erVisitRate: row.er_visit_rate,
        })),
      };
    }),
});
