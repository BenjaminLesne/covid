"use client";

import { useNationalTrend } from "@/hooks/use-wastewater-data";
import { calculateSeverityLevel, calculateTrend } from "@/lib/severity";
import { SeverityBadge } from "./severity-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { TrendDirection } from "@/types/wastewater";

function TrendArrow({ trend }: { trend: TrendDirection }) {
  const config: Record<TrendDirection, { arrow: string; label: string }> = {
    increasing: { arrow: "\u2191", label: "En hausse" },
    stable: { arrow: "\u2192", label: "Stable" },
    decreasing: { arrow: "\u2193", label: "En baisse" },
  };

  const { arrow, label } = config[trend];

  return (
    <span className="text-muted-foreground flex items-center gap-1 text-sm">
      <span className="text-lg" aria-hidden="true">
        {arrow}
      </span>
      {label}
    </span>
  );
}

function formatWeekDate(week: string): string {
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
  const locale = typeof navigator !== "undefined" ? navigator.language : "fr-FR";
  return target.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}

export function SeveritySummary() {
  const { data: nationalTrend, isLoading, isError, refetch } =
    useNationalTrend();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Niveau national — eaux usées</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-40" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Niveau national — eaux usées</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-2">
          <p className="text-muted-foreground text-sm">
            Données non disponibles — erreur de chargement
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!nationalTrend || nationalTrend.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Niveau national — eaux usées</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Données non disponibles
          </p>
        </CardContent>
      </Card>
    );
  }

  // Get the latest and two-weeks-ago values
  const latest = nationalTrend[nationalTrend.length - 1];
  const twoWeeksAgo =
    nationalTrend.length >= 3
      ? nationalTrend[nationalTrend.length - 3]
      : null;

  // Compute severity from all historical smoothed values
  const historicalValues = nationalTrend.map((d) => d.smoothedValue);
  const currentValue = latest.smoothedValue;
  const level = calculateSeverityLevel(currentValue, historicalValues);
  const trend = calculateTrend(
    currentValue,
    twoWeeksAgo?.smoothedValue ?? null
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Niveau national — eaux usées</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <SeverityBadge level={level} size="lg" />
        <TrendArrow trend={trend} />
        <p className="text-muted-foreground text-xs">
          Dernière mise à jour : {formatWeekDate(latest.week)}
        </p>
      </CardContent>
    </Card>
  );
}
