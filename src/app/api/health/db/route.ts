import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { syncMetadataTable } from "@/server/db/schema";
import { desc, sql } from "drizzle-orm";

export async function GET() {
  const start = performance.now();

  try {
    // 1. Check database connectivity
    await db.execute(sql`SELECT 1`);

    // 2. Get last sync metadata
    const [lastSync] = await db
      .select()
      .from(syncMetadataTable)
      .orderBy(desc(syncMetadataTable.started_at))
      .limit(1);

    const responseTimeMs = Math.round(performance.now() - start);

    return NextResponse.json({
      connected: true,
      lastSync: lastSync
        ? {
            status: lastSync.status,
            startedAt: lastSync.started_at.toISOString(),
            completedAt: lastSync.completed_at?.toISOString() ?? null,
            stationsCount: lastSync.stations_count,
            wastewaterCount: lastSync.wastewater_count,
            clinicalCount: lastSync.clinical_count,
          }
        : null,
      responseTimeMs,
    });
  } catch {
    const responseTimeMs = Math.round(performance.now() - start);
    return NextResponse.json(
      {
        connected: false,
        lastSync: null,
        responseTimeMs,
      },
      { status: 503 },
    );
  }
}
