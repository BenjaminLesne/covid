/**
 * Sync API route — orchestrates the full data sync pipeline.
 *
 * Called daily at 06:00 UTC by Vercel Cron Jobs (configured in vercel.json).
 * Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` to cron endpoints.
 * Can also be triggered manually for seeding: npm run db:seed
 *
 * Environment variables required (set in Vercel project settings > Environment Variables):
 *   - POSTGRES_URL: Vercel Postgres connection string (set automatically when linking a Vercel Postgres DB)
 *   - CRON_SECRET: shared secret for authenticating cron requests — must be set manually in Vercel project settings
 */

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { syncMetadataTable } from "@/server/db/schema";
import { syncWastewaterData } from "@/server/services/sync/wastewater-sync";
import { syncClinicalData } from "@/server/services/sync/clinical-sync";

export const maxDuration = 60;

export async function GET(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get("Authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const errors: string[] = [];

  // Insert a running sync_metadata row
  const [syncRow] = await db
    .insert(syncMetadataTable)
    .values({ status: "running" })
    .returning({ id: syncMetadataTable.id });

  let stationsCount = 0;
  let wastewaterCount = 0;
  let clinicalCount = 0;

  try {
    // Sync wastewater data
    try {
      const wwResult = await syncWastewaterData(db);
      stationsCount = wwResult.stationsCount;
      wastewaterCount = wwResult.indicatorsCount;
    } catch (err) {
      errors.push(
        `Wastewater sync failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // Sync clinical data
    try {
      const clinicalResult = await syncClinicalData(db);
      clinicalCount = clinicalResult.indicatorsCount;
    } catch (err) {
      errors.push(
        `Clinical sync failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // Determine final status
    const status =
      errors.length === 0
        ? "success"
        : stationsCount > 0 || wastewaterCount > 0 || clinicalCount > 0
          ? "partial"
          : "failed";

    // Update sync_metadata row
    await db
      .update(syncMetadataTable)
      .set({
        completed_at: new Date(),
        status,
        stations_count: stationsCount,
        wastewater_count: wastewaterCount,
        clinical_count: clinicalCount,
        errors: errors.length > 0 ? JSON.stringify(errors) : null,
      })
      .where(eq(syncMetadataTable.id, syncRow.id));

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      status,
      stationsCount,
      wastewaterCount,
      clinicalCount,
      errors: errors.length > 0 ? errors : null,
      durationMs,
    });
  } catch (err) {
    // Catastrophic failure — update sync_metadata and return error
    const errorMsg = err instanceof Error ? err.message : String(err);

    await db
      .update(syncMetadataTable)
      .set({
        completed_at: new Date(),
        status: "failed",
        errors: JSON.stringify([...errors, errorMsg]),
      })
      .where(eq(syncMetadataTable.id, syncRow.id));

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      status: "failed",
      stationsCount,
      wastewaterCount,
      clinicalCount,
      errors: [...errors, errorMsg],
      durationMs,
    });
  }
}
