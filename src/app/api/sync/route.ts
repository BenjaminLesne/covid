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
 *
 * Initial database seed process:
 *   1. Set POSTGRES_URL and CRON_SECRET in .env.local
 *   2. Run `npm run dev` to start the dev server
 *   3. In another terminal, run `npm run db:push` to create tables from the schema
 *   4. Run `npm run db:seed` to trigger a full sync and populate all tables
 */

import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { env } from "@/env";
import { db } from "@/server/db";
import { syncMetadataTable, wastewaterIndicatorsTable } from "@/server/db/schema";
import { syncWastewaterData } from "@/server/services/sync/wastewater-sync";
import { syncClinicalData } from "@/server/services/sync/clinical-sync";
import { syncRougeoleData } from "@/server/services/sync/rougeole-sync";
import { notifyDiscord } from "@/server/services/sync/notify";

export const maxDuration = 60;

export async function GET(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get("Authorization");
  const expected = `Bearer ${env.CRON_SECRET}`;

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
  let rougeoleCount = 0;

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

    // Sync rougeole data
    try {
      const rougeoleResult = await syncRougeoleData(db);
      rougeoleCount = rougeoleResult.indicatorsCount;
    } catch (err) {
      errors.push(
        `Rougeole sync failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // Check for stale wastewater data and alert via Discord
    if (wastewaterCount > 0) {
      try {
        const [latest] = await db
          .select({ maxWeek: sql<string>`max(${wastewaterIndicatorsTable.week})` })
          .from(wastewaterIndicatorsTable);

        if (latest?.maxWeek) {
          const [yearStr, weekStr] = latest.maxWeek.split("-W");
          const latestYear = Number(yearStr);
          const latestWeek = Number(weekStr);

          // Compute current ISO week
          const now = new Date();
          const jan4 = new Date(now.getFullYear(), 0, 4);
          const dayOfYear = Math.floor((now.getTime() - jan4.getTime()) / 86_400_000) + jan4.getDay();
          const currentWeek = Math.ceil(dayOfYear / 7);
          const currentYear = now.getFullYear();

          // Approximate week gap (works across year boundaries for small gaps)
          const gap = (currentYear - latestYear) * 52 + (currentWeek - latestWeek);

          if (gap > 2) {
            const currentWeekStr = `${currentYear}-W${String(currentWeek).padStart(2, "0")}`;
            await notifyDiscord(
              `**[EauxVid Alert]** Wastewater data is stale — latest week is ${latest.maxWeek}, expected at least ${currentWeekStr} (gap: ${gap} weeks)`,
            );
          }
        }
      } catch {
        // Non-critical — don't fail the sync over a notification error
      }
    }

    // Determine final status
    const status =
      errors.length === 0
        ? "success"
        : stationsCount > 0 || wastewaterCount > 0 || clinicalCount > 0 || rougeoleCount > 0
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
        rougeole_count: rougeoleCount,
        errors: errors.length > 0 ? JSON.stringify(errors) : null,
      })
      .where(eq(syncMetadataTable.id, syncRow.id));

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      status,
      stationsCount,
      wastewaterCount,
      clinicalCount,
      rougeoleCount,
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
      rougeoleCount,
      errors: [...errors, errorMsg],
      durationMs,
    });
  }
}
