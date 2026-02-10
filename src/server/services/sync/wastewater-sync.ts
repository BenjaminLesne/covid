/**
 * Wastewater data ingestion service.
 *
 * Fetches wastewater data from government APIs via the existing sumeau service
 * and upserts it into the local Postgres database.
 */

import { sql } from "drizzle-orm";
import type { VercelPgDatabase } from "drizzle-orm/vercel-postgres";
import {
  stationsTable,
  wastewaterIndicatorsTable,
} from "@/server/db/schema";
import { fetchIndicators, fetchStations } from "@/server/services/sumeau";

const BATCH_SIZE = 500;

/** Split an array into chunks of the given size. */
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Fetch wastewater data from government APIs and upsert into the database.
 *
 * @returns The number of stations and indicators upserted.
 * @throws If fetchIndicators() or fetchStations() throws.
 */
export async function syncWastewaterData(
  db: VercelPgDatabase,
): Promise<{ stationsCount: number; indicatorsCount: number }> {
  const [indicators, stations] = await Promise.all([
    fetchIndicators(),
    fetchStations(),
  ]);

  // Upsert stations
  let stationsCount = 0;
  for (const batch of chunk(stations, BATCH_SIZE)) {
    await db
      .insert(stationsTable)
      .values(
        batch.map((s) => ({
          sandre_id: s.sandreId,
          name: s.name,
          commune: s.commune,
          population: s.population,
          lat: s.lat,
          lng: s.lng,
          updated_at: new Date(),
        })),
      )
      .onConflictDoUpdate({
        target: stationsTable.sandre_id,
        set: {
          name: sql`excluded.name`,
          commune: sql`excluded.commune`,
          population: sql`excluded.population`,
          lat: sql`excluded.lat`,
          lng: sql`excluded.lng`,
          updated_at: sql`excluded.updated_at`,
        },
      });
    stationsCount += batch.length;
  }

  // Upsert indicators in batches
  let indicatorsCount = 0;
  for (const batch of chunk(indicators, BATCH_SIZE)) {
    await db
      .insert(wastewaterIndicatorsTable)
      .values(
        batch.map((ind) => ({
          week: ind.week,
          station_id: ind.stationId,
          value: ind.value,
          smoothed_value: ind.smoothedValue,
        })),
      )
      .onConflictDoUpdate({
        target: [
          wastewaterIndicatorsTable.station_id,
          wastewaterIndicatorsTable.week,
        ],
        set: {
          value: sql`excluded.value`,
          smoothed_value: sql`excluded.smoothed_value`,
        },
      });
    indicatorsCount += batch.length;
  }

  return { stationsCount, indicatorsCount };
}
