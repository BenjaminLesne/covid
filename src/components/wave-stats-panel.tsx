"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useStationPreferences } from "@/hooks/use-station-preferences";
import { NATIONAL_STATION_ID, NATIONAL_COLUMN } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
} from "@/components/ui/popover";

/** Format a number with French locale (comma decimals). */
function fmt(value: number | null, decimals = 1): string {
  if (value === null) return "—";
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Convert ISO week string "YYYY-WXX" to a human-friendly date (e.g. "23 mars 2026"). */
function formatWeekHuman(week: string): string {
  const match = week.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return week;
  const year = parseInt(match[1], 10);
  const weekNum = parseInt(match[2], 10);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1);
  const target = new Date(week1Monday);
  target.setUTCDate(week1Monday.getUTCDate() + (weekNum - 1) * 7);
  return target.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  info?: React.ReactNode;
}

function StatCard({ label, value, unit, info }: StatCardProps) {
  return (
    <Card className="py-4">
      <CardContent className="flex flex-col gap-1">
        <span className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
          {label}
          {info}
        </span>
        <span className="text-2xl font-bold tracking-tight">{value}</span>
        {unit && (
          <span className="text-muted-foreground text-xs">{unit}</span>
        )}
      </CardContent>
    </Card>
  );
}

function InfoButton({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] leading-none transition-colors"
          aria-label={`Info : ${title}`}
        >
          ?
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="w-64">
        <PopoverHeader>
          <PopoverTitle>{title}</PopoverTitle>
          <PopoverDescription>{children}</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
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

  const stats = data?.stats;

  const nextWaveEstimate = useMemo(() => {
    if (!forecastData || forecastData.length === 0 || !stats?.avgAmplitude) {
      return null;
    }
    return forecastData[forecastData.length - 1]?.week ?? null;
  }, [forecastData, stats?.avgAmplitude]);

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

  const firstWaveYear = data.waves.length > 0
    ? data.waves[0].startWeek.slice(0, 4)
    : null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-muted-foreground text-sm font-medium">
        Statistiques des vagues épidémiques
      </h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Nombre de vagues"
          value={String(stats.waveCount)}
          unit={firstWaveYear ? `depuis ${firstWaveYear}` : undefined}
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
          unit="indice de concentration"
          info={
            <InfoButton title="Amplitude d'une vague">
              Différence entre le pic de concentration virale dans les eaux usées et le niveau de base avant la vague. Plus la valeur est élevée, plus la vague est intense. La valeur ± indique la variabilité entre les vagues observées.
            </InfoButton>
          }
        />
        <StatCard
          label="Intervalle entre vagues"
          value={`${fmt(stats.avgInterWaveGap)} ± ${fmt(stats.stdInterWaveGap)}`}
          unit="semaines"
        />
        {nextWaveEstimate && (
          <StatCard
            label="Prochaine vague estimée"
            value={`semaine du ${formatWeekHuman(nextWaveEstimate)}`}
          />
        )}
      </div>
    </div>
  );
}
