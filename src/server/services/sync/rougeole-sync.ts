/**
 * Rougeole data ingestion service.
 *
 * Fetches rougeole mandatory notification data from the Odissé API
 * and upserts it into the local Postgres database.
 * Computes national aggregates (weighted average rate) per year.
 */

import { sql } from "drizzle-orm";
import type { VercelPgDatabase } from "drizzle-orm/vercel-postgres";
import { rougeoleIndicatorsTable } from "@/server/db/schema";
import { fetchRougeoleIndicators } from "@/server/services/rougeole";

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
 * Fetch rougeole data from the Odissé API and upsert into the database.
 *
 * 1. Upserts department-level rows from the API response.
 * 2. Computes national totals per year: sum cases, weighted average rate.
 * 3. Inserts national rows with department='national'.
 *
 * @returns The number of rougeole indicators upserted.
 */
export async function syncRougeoleData(
  db: VercelPgDatabase,
): Promise<{ indicatorsCount: number }> {
  const indicators = await fetchRougeoleIndicators();

  let indicatorsCount = 0;

  // 1. Upsert department-level rows
  const deptRows = indicators.map((ind) => ({
    year: ind.annee,
    department: ind.dep,
    notification_rate: ind.tx,
    cases: ind.rou != null ? Math.round(ind.rou) : null,
  }));

  for (const batch of chunk(deptRows, BATCH_SIZE)) {
    await db
      .insert(rougeoleIndicatorsTable)
      .values(batch)
      .onConflictDoUpdate({
        target: [
          rougeoleIndicatorsTable.year,
          rougeoleIndicatorsTable.department,
        ],
        set: {
          notification_rate: sql`excluded.notification_rate`,
          cases: sql`excluded.cases`,
        },
      });
    indicatorsCount += batch.length;
  }

  // 2. Compute national aggregates per year
  const yearMap = new Map<
    string,
    { totalCases: number; totalPopulation: number }
  >();

  for (const ind of indicators) {
    if (ind.rou == null || ind.population == null) continue;

    const existing = yearMap.get(ind.annee);
    if (existing) {
      existing.totalCases += ind.rou;
      existing.totalPopulation += ind.population;
    } else {
      yearMap.set(ind.annee, {
        totalCases: ind.rou,
        totalPopulation: ind.population,
      });
    }
  }

  // 3. Upsert national rows
  const nationalRows = Array.from(yearMap.entries()).map(
    ([year, { totalCases, totalPopulation }]) => ({
      year,
      department: "national" as const,
      notification_rate:
        totalPopulation > 0 ? (totalCases / totalPopulation) * 100_000 : null,
      cases: Math.round(totalCases),
    }),
  );

  for (const batch of chunk(nationalRows, BATCH_SIZE)) {
    await db
      .insert(rougeoleIndicatorsTable)
      .values(batch)
      .onConflictDoUpdate({
        target: [
          rougeoleIndicatorsTable.year,
          rougeoleIndicatorsTable.department,
        ],
        set: {
          notification_rate: sql`excluded.notification_rate`,
          cases: sql`excluded.cases`,
        },
      });
    indicatorsCount += batch.length;
  }

  return { indicatorsCount };
}
