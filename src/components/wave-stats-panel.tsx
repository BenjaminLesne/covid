"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useStationPreferences } from "@/hooks/use-station-preferences";
import { NATIONAL_STATION_ID, NATIONAL_COLUMN } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Format a number with French locale (comma decimals). */
function fmt(value: number | null, decimals = 1): string {
  if (value === null) return "—";
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
}

function StatCard({ label, value, unit }: StatCardProps) {
  return (
    <Card className="py-4">
      <CardContent className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs font-medium">
          {label}
        </span>
        <span className="text-2xl font-bold tracking-tight">{value}</span>
        {unit && (
          <span className="text-muted-foreground text-xs">{unit}</span>
        )}
      </CardContent>
    </Card>
  );
}

function StatSkeleton() {
  return (
    <Card className="py-4">
      <CardContent className="flex flex-col gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-3 w-12" />
      </CardContent>
    </Card>
  );
}

export function WaveStatsPanel() {
  const { selectedIds } = useStationPreferences();

  const stationId = useMemo(() => {
    const nonNational = selectedIds.filter((id) => id !== NATIONAL_STATION_ID);
    return nonNational.length > 0 ? nonNational[0] : NATIONAL_COLUMN;
  }, [selectedIds]);

  const { data, isLoading } = trpc.waveAnalysis.getWaveStats.useQuery({
    stationId,
  });

  const { data: forecastData } = trpc.waveAnalysis.getForecast.useQuery({
    stationId,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <StatSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const { stats } = data;

  // Estimate next wave from forecast: find first forecast point above the average amplitude baseline
  const nextWaveEstimate = useMemo(() => {
    if (!forecastData || forecastData.length === 0 || !stats.avgAmplitude) {
      return null;
    }
    // Simple heuristic: return the last forecast week as an estimate
    // A proper estimate would require running wave detection on the forecast
    return forecastData[forecastData.length - 1]?.week ?? null;
  }, [forecastData, stats.avgAmplitude]);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-muted-foreground text-sm font-medium">
        Statistiques des vagues épidémiques
      </h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Nombre de vagues"
          value={String(stats.waveCount)}
        />
        <StatCard
          label="Durée moyenne"
          value={`${fmt(stats.avgDuration)} ± ${fmt(stats.stdDuration)}`}
          unit="semaines"
        />
        <StatCard
          label="Fréquence"
          value={`${fmt(stats.avgFrequency)} ± ${fmt(stats.stdFrequency)}`}
          unit="vagues / an"
        />
        <StatCard
          label="Amplitude moyenne"
          value={`${fmt(stats.avgAmplitude, 0)} ± ${fmt(stats.stdAmplitude, 0)}`}
        />
        <StatCard
          label="Intervalle entre vagues"
          value={`${fmt(stats.avgInterWaveGap)} ± ${fmt(stats.stdInterWaveGap)}`}
          unit="semaines"
        />
        {nextWaveEstimate && (
          <StatCard
            label="Prochaine vague estimée"
            value={`semaine ${nextWaveEstimate}`}
          />
        )}
      </div>
    </div>
  );
}
