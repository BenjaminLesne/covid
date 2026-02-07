"use client";

import { useMemo, useState, useCallback } from "react";
import { Line, XAxis, YAxis, CartesianGrid, ComposedChart } from "recharts";
import { trpc } from "@/lib/trpc";
import { useStationPreferences } from "@/hooks/use-station-preferences";
import { useDateRange } from "@/hooks/use-date-range";
import { NATIONAL_STATION_ID } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ChartLegend, type LegendEntry } from "@/components/chart/chart-legend";
import type { Station } from "@/types/wastewater";

/** Predefined colors for chart lines. */
export const LINE_COLORS = [
  "hsl(210, 90%, 55%)", // blue
  "hsl(340, 80%, 55%)", // pink
  "hsl(160, 70%, 40%)", // teal
  "hsl(30, 90%, 55%)",  // orange
  "hsl(270, 70%, 55%)", // purple
  "hsl(50, 90%, 45%)",  // gold
] as const;

/** The national aggregate column name in the indicators data. */
const NATIONAL_COLUMN = "National_54";

/** Build a mapping from SANDRE ID → station display name (column name in indicators). */
function buildSandreToColumnMap(stations: Station[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const s of stations) {
    map.set(s.sandreId, s.name);
  }
  return map;
}

/** Convert ISO week string "2024-W03" to a readable date label. */
function formatWeekLabel(week: string): string {
  const match = week.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return week;
  return `S${parseInt(match[2], 10)} ${match[1]}`;
}

/** Convert ISO date (YYYY-MM-DD) to ISO week string (YYYY-WNN) for filtering. */
function dateToISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Set to nearest Thursday (current date + 4 - current day number, make Sunday 7)
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

interface ChartDataPoint {
  week: string;
  [key: string]: number | string | null;
}

export function WastewaterChart() {
  const { selectedIds } = useStationPreferences();
  const { dateRange } = useDateRange();

  // Map "national" to "National_54" for querying, and get station names for others
  const { data: stations, isLoading: stationsLoading } =
    trpc.wastewater.getStations.useQuery();

  const sandreToColumn = useMemo(
    () => (stations ? buildSandreToColumnMap(stations) : new Map<string, string>()),
    [stations]
  );

  // Build the list of indicator stationIds to request
  const indicatorStationIds = useMemo(() => {
    return selectedIds.map((id) => {
      if (id === NATIONAL_STATION_ID) return NATIONAL_COLUMN;
      return sandreToColumn.get(id) ?? id;
    });
  }, [selectedIds, sandreToColumn]);

  // Convert date range to ISO weeks for filtering
  const weekRange = useMemo(() => {
    return {
      from: dateToISOWeek(new Date(dateRange.from)),
      to: dateToISOWeek(new Date(dateRange.to)),
    };
  }, [dateRange]);

  const { data: indicators, isLoading: indicatorsLoading } =
    trpc.wastewater.getIndicators.useQuery(
      {
        stationIds: indicatorStationIds,
        dateRange: weekRange,
      },
      {
        enabled: indicatorStationIds.length > 0 && !!stations,
      }
    );

  // Build stable display name mapping: stationId → label
  const displayNames = useMemo(() => {
    const map = new Map<string, string>();
    map.set(NATIONAL_COLUMN, "Moyenne nationale");
    if (stations) {
      for (const s of stations) {
        map.set(s.name, s.name);
      }
    }
    return map;
  }, [stations]);

  // Build chart config
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    indicatorStationIds.forEach((stationId, index) => {
      const smoothedKey = `${stationId}_smoothed`;
      const rawKey = `${stationId}_raw`;
      const label = displayNames.get(stationId) ?? stationId;
      config[smoothedKey] = {
        label,
        color: LINE_COLORS[index % LINE_COLORS.length],
      };
      config[rawKey] = {
        label: `${label} (brut)`,
        color: LINE_COLORS[index % LINE_COLORS.length],
      };
    });
    return config;
  }, [indicatorStationIds, displayNames]);

  // Pivot indicators into Recharts data format: one row per week
  const chartData = useMemo(() => {
    if (!indicators || indicators.length === 0) return [];

    // Group by week
    const weekMap = new Map<string, ChartDataPoint>();
    for (const ind of indicators) {
      let point = weekMap.get(ind.week);
      if (!point) {
        point = { week: ind.week };
        weekMap.set(ind.week, point);
      }
      point[`${ind.stationId}_smoothed`] = ind.smoothedValue;
      point[`${ind.stationId}_raw`] = ind.value;
    }

    // Sort by week chronologically
    return Array.from(weekMap.values()).sort((a, b) =>
      (a.week as string).localeCompare(b.week as string)
    );
  }, [indicators]);

  // Legend entries derived from chart config
  const legendEntries: LegendEntry[] = useMemo(() => {
    return indicatorStationIds.map((stationId, index) => ({
      key: stationId,
      label: displayNames.get(stationId) ?? stationId,
      color: LINE_COLORS[index % LINE_COLORS.length],
    }));
  }, [indicatorStationIds, displayNames]);

  // Track which lines are hidden
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  const toggleLine = useCallback((key: string) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const isLoading = stationsLoading || indicatorsLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-[300px] w-full sm:h-[400px] md:h-[450px]" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed sm:h-[400px] md:h-[450px]">
        <p className="text-muted-foreground text-sm">
          Aucune donnée disponible pour la période sélectionnée.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:gap-4">
      <div className="min-w-0 flex-1">
        <ChartContainer config={chartConfig} className="h-[300px] w-full sm:h-[400px] md:h-[450px]">
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="week"
              tickFormatter={formatWeekLabel}
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v))
              }
              width={45}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(label) => {
                    const week = String(label);
                    return formatWeekLabel(week);
                  }}
                  formatter={(value, name, _item, _index, payload) => {
                    const key = String(name);
                    // Hide raw data entries from tooltip (they duplicate smoothed)
                    if (key.endsWith("_raw")) return null;
                    const configEntry = chartConfig[key];
                    // Show raw value alongside smoothed if they differ
                    const rawKey = key.replace(/_smoothed$/, "_raw");
                    const rawValue = payload?.[rawKey as keyof typeof payload];
                    const smoothedStr =
                      value != null
                        ? Number(value).toLocaleString("fr-FR", {
                            maximumFractionDigits: 2,
                          })
                        : "—";
                    const rawStr =
                      rawValue != null && rawValue !== value
                        ? ` (brut : ${Number(rawValue).toLocaleString("fr-FR", { maximumFractionDigits: 2 })})`
                        : "";
                    return (
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px]"
                          style={{ backgroundColor: configEntry?.color as string }}
                        />
                        <span className="text-muted-foreground">
                          {configEntry?.label ?? key}
                        </span>
                        <span className="font-mono font-medium ml-auto">
                          {smoothedStr}{rawStr}
                        </span>
                      </span>
                    );
                  }}
                />
              }
            />

            {/* Smoothed trend lines (solid) */}
            {indicatorStationIds.map((stationId, index) => (
              <Line
                key={`${stationId}_smoothed`}
                type="monotone"
                dataKey={`${stationId}_smoothed`}
                stroke={LINE_COLORS[index % LINE_COLORS.length]}
                strokeWidth={2}
                dot={false}
                connectNulls
                name={`${stationId}_smoothed`}
                hide={hiddenKeys.has(stationId)}
              />
            ))}

            {/* Raw data points (dots overlay) */}
            {indicatorStationIds.map((stationId, index) => (
              <Line
                key={`${stationId}_raw`}
                type="monotone"
                dataKey={`${stationId}_raw`}
                stroke="none"
                dot={{
                  fill: LINE_COLORS[index % LINE_COLORS.length],
                  r: 2,
                  strokeWidth: 0,
                }}
                activeDot={{
                  r: 4,
                  fill: LINE_COLORS[index % LINE_COLORS.length],
                }}
                connectNulls={false}
                legendType="none"
                name={`${stationId}_raw`}
                hide={hiddenKeys.has(stationId)}
              />
            ))}
          </ComposedChart>
        </ChartContainer>
      </div>
      <ChartLegend entries={legendEntries} hiddenKeys={hiddenKeys} onToggle={toggleLine} />
    </div>
  );
}
