import { z } from "zod";
import { router, publicProcedure } from "../init";
import { db } from "@/server/db";
import {
  stationsTable,
  wastewaterIndicatorsTable,
} from "@/server/db/schema";
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import type { NationalAggregate } from "@/types/wastewater";

/**
 * The national aggregate column name in the indicators data.
 * "National_54" represents all 54 stations.
 */
const NATIONAL_COLUMN = "National_54";

export const wastewaterRouter = router({
  /**
   * Get wastewater indicators, optionally filtered by station IDs and date range.
   */
  getIndicators: publicProcedure
    .input(
      z
        .object({
          stationIds: z.array(z.string()).optional(),
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

      if (input?.stationIds && input.stationIds.length > 0) {
        conditions.push(
          inArray(wastewaterIndicatorsTable.station_id, input.stationIds)
        );
      }

      if (input?.dateRange) {
        conditions.push(
          gte(wastewaterIndicatorsTable.week, input.dateRange.from)
        );
        conditions.push(
          lte(wastewaterIndicatorsTable.week, input.dateRange.to)
        );
      }

      const rows = await db
        .select()
        .from(wastewaterIndicatorsTable)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return rows.map((row) => ({
        week: row.week,
        stationId: row.station_id,
        value: row.value,
        smoothedValue: row.smoothed_value,
      }));
    }),

  /**
   * Get all station metadata.
   */
  getStations: publicProcedure.query(async () => {
    const rows = await db.select().from(stationsTable);

    return rows.map((row) => ({
      name: row.name,
      commune: row.commune,
      sandreId: row.sandre_id,
      population: row.population,
      lat: row.lat,
      lng: row.lng,
    }));
  }),

  /**
   * Get national aggregate time series.
   * Queries the National_54 station from wastewater_indicators and returns as NationalAggregate[].
   */
  getNationalTrend: publicProcedure.query(async () => {
    const rows = await db
      .select()
      .from(wastewaterIndicatorsTable)
      .where(eq(wastewaterIndicatorsTable.station_id, NATIONAL_COLUMN))
      .orderBy(asc(wastewaterIndicatorsTable.week));

    const national: NationalAggregate[] = rows.map((row) => ({
      week: row.week,
      value: row.value,
      smoothedValue: row.smoothed_value,
    }));

    return national;
  }),
});
