import { z } from "zod";
import { router, publicProcedure } from "../init";
import { db } from "@/server/db";
import {
  wastewaterIndicatorsTable,
  forecastSnapshotsTable,
} from "@/server/db/schema";
import { and, asc, desc, eq, sql } from "drizzle-orm";
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

  getCompositeForecast: publicProcedure.query(async () => {
    const latestSnapshot = db
      .select({
        target_week: forecastSnapshotsTable.target_week,
        max_snapshot: sql<string>`max(${forecastSnapshotsTable.snapshot_date})`.as(
          "max_snapshot",
        ),
      })
      .from(forecastSnapshotsTable)
      .groupBy(forecastSnapshotsTable.target_week)
      .as("latest");

    const rows = await db
      .select({
        targetWeek: forecastSnapshotsTable.target_week,
        predictedValue: forecastSnapshotsTable.predicted_value,
        snapshotDate: forecastSnapshotsTable.snapshot_date,
      })
      .from(forecastSnapshotsTable)
      .innerJoin(
        latestSnapshot,
        and(
          eq(forecastSnapshotsTable.target_week, latestSnapshot.target_week),
          eq(forecastSnapshotsTable.snapshot_date, latestSnapshot.max_snapshot),
        ),
      )
      .orderBy(asc(forecastSnapshotsTable.target_week));

    return rows;
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
