"use client";

import "leaflet/dist/leaflet.css";

import { useMemo } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import { trpc } from "@/lib/trpc";
import { calculateSeverityLevel, calculateTrend } from "@/lib/severity";
import { StationMarker } from "./station-marker";
import { Skeleton } from "@/components/ui/skeleton";
import type { SeverityLevel, TrendDirection } from "@/types/wastewater";

/** Default center and zoom for mainland France. */
const FRANCE_CENTER = [46.6, 2.5] as [number, number];
const FRANCE_ZOOM = 6;

interface StationSeverity {
  stationId: string;
  level: SeverityLevel;
  trend: TrendDirection;
}

export function FranceMapInner() {
  const { data: stations, isLoading: stationsLoading } =
    trpc.wastewater.getStations.useQuery();

  const { data: indicators, isLoading: indicatorsLoading } =
    trpc.wastewater.getIndicators.useQuery(undefined, {
      enabled: !!stations,
    });

  // Compute severity level and trend for each station
  const stationSeverities = useMemo(() => {
    if (!stations || !indicators) return new Map<string, StationSeverity>();

    // Group indicators by station name (column name in data)
    const byStation = new Map<string, { values: (number | null)[]; weeks: string[] }>();
    for (const ind of indicators) {
      let entry = byStation.get(ind.stationId);
      if (!entry) {
        entry = { values: [], weeks: [] };
        byStation.set(ind.stationId, entry);
      }
      entry.values.push(ind.smoothedValue);
      entry.weeks.push(ind.week);
    }

    const severityMap = new Map<string, StationSeverity>();
    for (const station of stations) {
      const stationData = byStation.get(station.name);
      if (!stationData || stationData.values.length === 0) continue;

      // Sort by week to get chronological order
      const sorted = stationData.weeks
        .map((w, i) => ({ week: w, value: stationData.values[i] }))
        .sort((a, b) => a.week.localeCompare(b.week));

      const latest = sorted[sorted.length - 1];
      const twoWeeksAgo = sorted.length >= 3 ? sorted[sorted.length - 3] : null;

      const level = calculateSeverityLevel(latest.value, sorted.map((s) => s.value));
      const trend = calculateTrend(latest.value, twoWeeksAgo?.value ?? null);

      severityMap.set(station.sandreId, {
        stationId: station.sandreId,
        level,
        trend,
      });
    }

    return severityMap;
  }, [stations, indicators]);

  const isLoading = stationsLoading || indicatorsLoading;

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full rounded-lg lg:h-[500px]" />;
  }

  if (!stations || stations.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed lg:h-[500px]">
        <p className="text-muted-foreground text-sm">
          Aucune station disponible.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[400px] w-full overflow-hidden rounded-lg border lg:h-[500px]">
      <MapContainer
        center={FRANCE_CENTER}
        zoom={FRANCE_ZOOM}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {stations.map((station) => {
          const severity = stationSeverities.get(station.sandreId);
          if (!severity) return null;
          return (
            <StationMarker
              key={station.sandreId}
              station={station}
              severityLevel={severity.level}
              trend={severity.trend}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
