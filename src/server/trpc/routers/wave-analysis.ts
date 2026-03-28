import { z } from "zod";
import { router, publicProcedure } from "../init";
import { db } from "@/server/db";
import {
  wastewaterIndicatorsTable,
  forecastSnapshotsTable,
} from "@/server/db/schema";
import { asc, desc, sql } from "drizzle-orm";
import { NATIONAL_COLUMN } from "@/lib/constants";
import { detectWaves } from "@/lib/wave-detection";
import { computeWaveStats, estimateNextWave } from "@/lib/wave-stats";
import { forecastWastewater } from "@/lib/forecast";

const stationInput = z
  .object({
    stationId: z.string().optional(),
  })
  .optional();

async function fetchSmoothedSeries(stationId: string) {
  const rows = await db
    .select({
      week: wastewaterIndicatorsTable.week,
      value: wastewaterIndicatorsTable.smoothed_value,
    })
    .from(wastewaterIndicatorsTable)
    .where(sql`lower(${wastewaterIndicatorsTable.station_id}) = lower(${stationId})`)
    .orderBy(asc(wastewaterIndicatorsTable.week));

  return rows;
}

export const waveAnalysisRouter = router({
  getWaveStats: publicProcedure
    .input(stationInput)
    .query(async ({ input }) => {
      const stationId = input?.stationId ?? NATIONAL_COLUMN;
      const series = await fetchSmoothedSeries(stationId);
      const waves = detectWaves(series);
      const stats = computeWaveStats(waves);
      return { waves, stats };
    }),

  getForecast: publicProcedure
    .input(stationInput)
    .query(async ({ input }) => {
      const stationId = input?.stationId ?? NATIONAL_COLUMN;
      const series = await fetchSmoothedSeries(stationId);
      return forecastWastewater(series);
    }),

  getNextWaveEstimate: publicProcedure
    .input(stationInput)
    .query(async ({ input }) => {
      const stationId = input?.stationId ?? NATIONAL_COLUMN;
      const series = await fetchSmoothedSeries(stationId);
      const waves = detectWaves(series);
      const forecast = forecastWastewater(series);
      return estimateNextWave(waves, forecast, series);
    }),

  getForecastHistory: publicProcedure.query(async () => {
    const rows = await db
      .select({
        id: forecastSnapshotsTable.id,
        snapshotDate: forecastSnapshotsTable.snapshot_date,
        targetWeek: forecastSnapshotsTable.target_week,
        predictedValue: forecastSnapshotsTable.predicted_value,
        lowerBound: forecastSnapshotsTable.lower_bound,
        upperBound: forecastSnapshotsTable.upper_bound,
      })
      .from(forecastSnapshotsTable)
      .orderBy(
        desc(forecastSnapshotsTable.snapshot_date),
        asc(forecastSnapshotsTable.target_week),
      );

    return rows;
  }),
});
