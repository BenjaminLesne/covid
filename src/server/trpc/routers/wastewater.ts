import { z } from "zod";
import { router, publicProcedure } from "../init";
import { fetchIndicators, fetchStations } from "@/server/services/sumeau";
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
      let indicators = await fetchIndicators();

      // Filter by station IDs if provided
      if (input?.stationIds && input.stationIds.length > 0) {
        const ids = new Set(input.stationIds);
        indicators = indicators.filter((ind) => ids.has(ind.stationId));
      }

      // Filter by date range if provided
      if (input?.dateRange) {
        const { from, to } = input.dateRange;
        indicators = indicators.filter(
          (ind) => ind.week >= from && ind.week <= to
        );
      }

      return indicators;
    }),

  /**
   * Get all station metadata.
   */
  getStations: publicProcedure.query(async () => {
    return fetchStations();
  }),

  /**
   * Get national aggregate time series.
   * Extracts the National_54 column from indicators and returns as NationalAggregate[].
   */
  getNationalTrend: publicProcedure.query(async () => {
    const indicators = await fetchIndicators();

    const national: NationalAggregate[] = indicators
      .filter((ind) => ind.stationId === NATIONAL_COLUMN)
      .map((ind) => ({
        week: ind.week,
        value: ind.value,
        smoothedValue: ind.smoothedValue,
      }))
      .sort((a, b) => a.week.localeCompare(b.week));

    return national;
  }),
});
