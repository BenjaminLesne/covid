"use client";

import { useMemo } from "react";
import { Line, XAxis, YAxis, CartesianGrid, ComposedChart } from "recharts";
import { trpc } from "@/lib/trpc";
import { useStationPreferences } from "@/hooks/use-station-preferences";
import { useDateRange } from "@/hooks/use-date-range";
import { useClinicalPreferences } from "@/hooks/use-clinical-preferences";
import { NATIONAL_STATION_ID, CLINICAL_DATASETS } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryError } from "@/components/query-error";
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

/** Prefix for clinical data keys in chart data points. */
const CLINICAL_KEY_PREFIX = "clinical_";

/** Build a mapping from SANDRE ID → station display name (column name in indicators). */
function buildSandreToColumnMap(stations: Station[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const s of stations) {
    map.set(s.sandreId, s.name);
  }
  return map;
}

/** Convert ISO week string "2024-W03" to the Monday date of that week. */
function isoWeekToDate(week: string): Date | null {
  const match = week.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const weekNum = parseInt(match[2], 10);
  // Jan 4 is always in ISO week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7; // Make Sunday = 7
  // Monday of week 1
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1);
  // Monday of target week
  const target = new Date(week1Monday);
  target.setUTCDate(week1Monday.getUTCDate() + (weekNum - 1) * 7);
  return target;
}

/** Get browser locale, falling back to fr-FR. */
function getLocale(): string {
  return typeof navigator !== "undefined" ? navigator.language : "fr-FR";
}

/** Format ISO week as short date for X-axis ticks (e.g. "15 janv."). */
function formatWeekLabel(week: string): string {
  const date = isoWeekToDate(week);
  if (!date) return week;
  return date.toLocaleDateString(getLocale(), { day: "numeric", month: "short" });
}

/** Format ISO week as full date for tooltips (e.g. "15 janv. 2024"). */
function formatWeekLabelFull(week: string): string {
  const date = isoWeekToDate(week);
  if (!date) return week;
  return date.toLocaleDateString(getLocale(), { day: "numeric", month: "short", year: "numeric" });
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

interface WastewaterChartProps {
  hiddenKeys: Set<string>;
  onToggle: (key: string) => void;
  department: string | null;
  departmentLabel: string;
}

export function WastewaterChart({ hiddenKeys, onToggle, department, departmentLabel }: WastewaterChartProps) {
  const { selectedIds } = useStationPreferences();
  const { dateRange } = useDateRange();
  const { enabledDiseases } = useClinicalPreferences();

  // Map "national" to "National_54" for querying, and get station names for others
  const { data: stations, isPending: stationsLoading, isError: stationsError, refetch: refetchStations } =
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

  const { data: indicators, isPending: indicatorsLoading, isError: indicatorsError, refetch: refetchIndicators } =
    trpc.wastewater.getIndicators.useQuery(
      {
        stationIds: indicatorStationIds,
        dateRange: weekRange,
      },
      {
        enabled: indicatorStationIds.length > 0 && !!stations,
      }
    );

  // Fetch clinical data independently — wastewater displays even if this fails
  const { data: clinicalIndicators } =
    trpc.clinical.getIndicators.useQuery(
      {
        diseaseIds: enabledDiseases.length > 0 ? enabledDiseases : undefined,
        dateRange: weekRange,
        department: department ?? undefined,
      },
      {
        enabled: enabledDiseases.length > 0,
      }
    );

  // Build stable display name mapping: stationId → label
  const displayNames = useMemo(() => {
    const map = new Map<string, string>();
    map.set(NATIONAL_COLUMN, "Moyenne nationale Covid");
    if (stations) {
      for (const s of stations) {
        map.set(s.name, s.name);
      }
    }
    return map;
  }, [stations]);

  // Build clinical label suffix for department scope
  const clinicalLabelSuffix = department ? ` (${departmentLabel})` : "";

  // Build chart config for both wastewater and clinical lines
  const fullChartConfig = useMemo(() => {
    const config: ChartConfig = {};
    // Wastewater entries
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
    // Clinical entries
    for (const diseaseId of enabledDiseases) {
      const meta = CLINICAL_DATASETS[diseaseId];
      const key = `${CLINICAL_KEY_PREFIX}${diseaseId}`;
      config[key] = {
        label: `${meta.label}${clinicalLabelSuffix}`,
        color: meta.color,
      };
    }
    return config;
  }, [indicatorStationIds, displayNames, enabledDiseases, clinicalLabelSuffix]);

  // Pivot indicators into Recharts data format: one row per week, merged with clinical data
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

    // Merge clinical data into existing chart points by week
    if (clinicalIndicators) {
      for (const ci of clinicalIndicators) {
        let point = weekMap.get(ci.week);
        if (!point) {
          point = { week: ci.week };
          weekMap.set(ci.week, point);
        }
        point[`${CLINICAL_KEY_PREFIX}${ci.diseaseId}`] = ci.erVisitRate;
      }
    }

    // Sort by week chronologically
    return Array.from(weekMap.values()).sort((a, b) =>
      (a.week as string).localeCompare(b.week as string)
    );
  }, [indicators, clinicalIndicators]);

  // Legend entries: wastewater (solid) + clinical (dashed)
  const legendEntries: LegendEntry[] = useMemo(() => {
    const entries: LegendEntry[] = indicatorStationIds.map((stationId, index) => ({
      key: stationId,
      label: displayNames.get(stationId) ?? stationId,
      color: LINE_COLORS[index % LINE_COLORS.length],
    }));
    // Add clinical entries with dashed style
    for (const diseaseId of enabledDiseases) {
      const meta = CLINICAL_DATASETS[diseaseId];
      entries.push({
        key: `${CLINICAL_KEY_PREFIX}${diseaseId}`,
        label: `${meta.label}${clinicalLabelSuffix}`,
        color: meta.color,
        dashed: true,
      });
    }
    return entries;
  }, [indicatorStationIds, displayNames, enabledDiseases, clinicalLabelSuffix]);

  // Determine if any clinical diseases are enabled and visible (not hidden)
  const hasClinicalVisible = useMemo(() => {
    return enabledDiseases.some(
      (id) => !hiddenKeys.has(`${CLINICAL_KEY_PREFIX}${id}`)
    );
  }, [enabledDiseases, hiddenKeys]);

  const isLoading = stationsLoading || indicatorsLoading;
  const isError = stationsError || indicatorsError;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-[300px] w-full sm:h-[400px] md:h-[450px]" />
      </div>
    );
  }

  if (isError) {
    return (
      <QueryError
        message="Impossible de charger les données. Veuillez réessayer."
        onRetry={() => {
          if (stationsError) void refetchStations();
          if (indicatorsError) void refetchIndicators();
        }}
        className="h-[300px] sm:h-[400px] md:h-[450px]"
      />
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
        <ChartContainer config={fullChartConfig} className="h-[300px] w-full sm:h-[400px] md:h-[450px]">
          <ComposedChart data={chartData} margin={{ top: 5, right: hasClinicalVisible ? 5 : 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="week"
              tickFormatter={formatWeekLabel}
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              yAxisId="wastewater"
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v))
              }
              width={55}
              label={{
                value: "Concentration eaux usées",
                angle: -90,
                position: "insideLeft",
                offset: 10,
                style: { fontSize: 11, fill: "var(--color-muted-foreground, #888)", textAnchor: "middle" },
              }}
            />
            {enabledDiseases.length > 0 && (
              <YAxis
                yAxisId="clinical"
                orientation="right"
                tick={hasClinicalVisible ? { fontSize: 11 } : false}
                tickFormatter={(v: number) => String(Math.round(v * 10) / 10)}
                width={hasClinicalVisible ? 65 : 0}
                hide={!hasClinicalVisible}
                axisLine={{ strokeDasharray: "6 3" }}
                label={hasClinicalVisible ? {
                  value: "Urgences /100k",
                  angle: 90,
                  position: "insideRight",
                  offset: 10,
                  style: { fontSize: 11, fill: "var(--color-muted-foreground, #888)", textAnchor: "middle" },
                } : undefined}
              />
            )}
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(label) => {
                    const week = String(label);
                    return formatWeekLabelFull(week);
                  }}
                  formatter={(value, name, _item, _index, payload) => {
                    const key = String(name);
                    // Hide raw data entries from tooltip (they duplicate smoothed)
                    if (key.endsWith("_raw")) return null;

                    const configEntry = fullChartConfig[key];
                    const isClinical = key.startsWith(CLINICAL_KEY_PREFIX);

                    if (isClinical) {
                      // Clinical: show value with /100k suffix, no raw/smoothed distinction
                      const valueStr =
                        value != null
                          ? `${Number(value).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}/100k`
                          : "—";
                      return (
                        <span className="flex items-center gap-2">
                          <svg className="shrink-0" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                            <line x1="0" y1="5" x2="10" y2="5" stroke={configEntry?.color as string} strokeWidth="2" strokeDasharray="3 1.5" />
                          </svg>
                          <span className="text-muted-foreground">
                            {configEntry?.label ?? key}
                          </span>
                          <span className="font-mono font-medium ml-auto">
                            {valueStr}
                          </span>
                        </span>
                      );
                    }

                    // Wastewater: show raw value alongside smoothed if they differ
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

            {/* Smoothed trend lines (solid) — wastewater */}
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
                yAxisId="wastewater"
                hide={hiddenKeys.has(stationId)}
              />
            ))}

            {/* Raw data points (dots overlay) — wastewater */}
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
                yAxisId="wastewater"
                hide={hiddenKeys.has(stationId)}
              />
            ))}

            {/* Clinical overlay lines (dashed) */}
            {enabledDiseases.map((diseaseId) => {
              const meta = CLINICAL_DATASETS[diseaseId];
              const key = `${CLINICAL_KEY_PREFIX}${diseaseId}`;
              return (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={meta.color}
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={false}
                  connectNulls
                  name={key}
                  yAxisId="clinical"
                  hide={hiddenKeys.has(key)}
                />
              );
            })}
          </ComposedChart>
        </ChartContainer>
      </div>
      <ChartLegend entries={legendEntries} hiddenKeys={hiddenKeys} onToggle={onToggle} />
    </div>
  );
}
