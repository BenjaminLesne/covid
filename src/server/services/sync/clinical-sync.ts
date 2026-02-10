/**
 * Clinical data ingestion service.
 *
 * Fetches clinical surveillance data from the Odissé API via the existing
 * clinical service and upserts it into the local Postgres database.
 */

import { sql } from "drizzle-orm";
import type { VercelPgDatabase } from "drizzle-orm/vercel-postgres";
import { clinicalIndicatorsTable } from "@/server/db/schema";
import { fetchClinicalIndicators } from "@/server/services/clinical";

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
 * Fetch clinical data from the Odissé API and upsert into the database.
 *
 * Uses fetchClinicalIndicators() which internally uses Promise.allSettled,
 * so partial data (some diseases failed) is still returned and upserted.
 * Warnings for failed diseases are logged by the clinical service.
 *
 * @returns The number of clinical indicators upserted.
 */
export async function syncClinicalData(
  db: VercelPgDatabase,
): Promise<{ indicatorsCount: number }> {
  const indicators = await fetchClinicalIndicators();

  let indicatorsCount = 0;
  for (const batch of chunk(indicators, BATCH_SIZE)) {
    await db
      .insert(clinicalIndicatorsTable)
      .values(
        batch.map((ind) => ({
          week: ind.week,
          disease_id: ind.diseaseId,
          department: "national" as const,
          er_visit_rate: ind.erVisitRate,
        })),
      )
      .onConflictDoUpdate({
        target: [
          clinicalIndicatorsTable.disease_id,
          clinicalIndicatorsTable.week,
          clinicalIndicatorsTable.department,
        ],
        set: {
          er_visit_rate: sql`excluded.er_visit_rate`,
        },
      });
    indicatorsCount += batch.length;
  }

  return { indicatorsCount };
}
