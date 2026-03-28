"use client";

import { useMemo } from "react";
import { Area, Line, XAxis, YAxis, CartesianGrid, ComposedChart, ReferenceArea, ReferenceLine } from "recharts";
import { trpc } from "@/lib/trpc";
import { useStationPreferences } from "@/hooks/use-station-preferences";
import { useDateRange } from "@/hooks/use-date-range";
import { useClinicalPreferences } from "@/hooks/use-clinical-preferences";
import { useAsOfDate } from "@/hooks/use-as-of-date";
import { useChartSettings } from "@/hooks/use-chart-settings";
import { NATIONAL_STATION_ID, NATIONAL_COLUMN, CLINICAL_DATASETS, slugifyStationName } from "@/lib/constants";
import { EVENT_CATEGORIES, getCategoryByKey } from "@/lib/event-categories";
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
import {
  formatWeekLabel,
  formatWeekLabelFull,
  dateToISOWeek,
  LINE_COLORS,
  CLINICAL_KEY_PREFIX,
} from "@/lib/chart-utils";

// Re-export for backwards compatibility
export { LINE_COLORS };

/** Color for forecast line and confidence band. */
const FORECAST_COLOR = "hsl(0, 0%, 60%)";
const FORECAST_KEY = "forecast";
const FORECAST_BAND_KEY = "forecast_band";

/** Composite prediction history (past forecasts). */
const PREDICTION_HISTORY_KEY = "prediction_history";
const PREDICTION_HISTORY_COLOR = "hsl(0, 0%, 75%)";

/** Prefix for event category keys in legend/hiddenKeys (e.g. event_sick). */
const EVENT_KEY_PREFIX = "event_";

/** Build a mapping from SANDRE ID → indicator column key (slugified station name). */
function buildSandreToColumnMap(stations: Station[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const s of stations) {
    map.set(s.sandreId, slugifyStationName(s.name));
  }
  return map;
}

interface ChartDataPoint {
  week: string;
  [key: string]: number | string | number[] | null;
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
  const { asOfDate } = useAsOfDate();
  const { showUpdates } = useChartSettings();

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
        asOfDate: asOfDate ?? undefined,
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
        asOfDate: asOfDate ?? undefined,
      },
      {
        enabled: enabledDiseases.length > 0,
      }
    );

  // Forecast: use first selected station (mapped to column name)
  const forecastStationId = indicatorStationIds[0] ?? NATIONAL_COLUMN;
  const { data: forecastData } = trpc.waveAnalysis.getForecast.useQuery(
    { stationId: forecastStationId },
    { enabled: !!stations },
  );

  // Composite forecast (historical predictions)
  const { data: compositeForecast } = trpc.waveAnalysis.getCompositeForecast.useQuery();

  // Data update dates (only fetch when settings toggle is on)
  const { data: updateDates } = trpc.wastewater.getDataUpdateDates.useQuery(undefined, {
    enabled: showUpdates,
  });

  // Convert update dates to ISO weeks for chart reference lines
  const updateWeeks = useMemo(() => {
    if (!updateDates) return [];
    return updateDates.map((dateStr) => ({
      week: dateToISOWeek(new Date(dateStr)),
      label: dateStr.slice(5), // MM-DD
    }));
  }, [updateDates]);

  // Events — only fetch when user is logged in
  const me = trpc.auth.me.useQuery();
  const userEvents = trpc.events.list.useQuery(undefined, {
    enabled: !!me.data,
  });

  // Build stable display name mapping: stationId → label
  const displayNames = useMemo(() => {
    const map = new Map<string, string>();
    map.set(NATIONAL_COLUMN, "Moyenne nationale Covid");
    if (stations) {
      for (const s of stations) {
        map.set(slugifyStationName(s.name), s.name);
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
    // Forecast entry
    config[FORECAST_KEY] = {
      label: "Prévision",
      color: FORECAST_COLOR,
    };
    // Prediction history entry
    config[PREDICTION_HISTORY_KEY] = {
      label: "Prédictions passées",
      color: PREDICTION_HISTORY_COLOR,
    };
    return config;
  }, [indicatorStationIds, displayNames, enabledDiseases, clinicalLabelSuffix]);

  // Pivot indicators into Recharts data format: one row per week, merged with clinical + forecast data
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

    // Merge composite forecast (historical predictions)
    if (compositeForecast) {
      for (const cf of compositeForecast) {
        let point = weekMap.get(cf.targetWeek);
        if (!point) {
          point = { week: cf.targetWeek };
          weekMap.set(cf.targetWeek, point);
        }
        point[PREDICTION_HISTORY_KEY] = cf.predictedValue;
      }
    }

    // Bridge forecast to last real data point and append forecast weeks
    if (forecastData && forecastData.length > 0) {
      // Find the last real smoothed value for the forecast station to bridge
      const smoothedKey = `${forecastStationId}_smoothed`;
      const sorted = Array.from(weekMap.values()).sort((a, b) =>
        (a.week as string).localeCompare(b.week as string)
      );
      const lastReal = sorted.findLast((p) => p[smoothedKey] != null);
      if (lastReal) {
        // Set forecast value on last real point to bridge (no gap)
        lastReal[FORECAST_KEY] = lastReal[smoothedKey] as number;
      }

      for (const fp of forecastData) {
        let point = weekMap.get(fp.week);
        if (!point) {
          point = { week: fp.week };
          weekMap.set(fp.week, point);
        }
        point[FORECAST_KEY] = fp.predictedValue;
        point[FORECAST_BAND_KEY] = [fp.lowerBound, fp.upperBound];
      }
    }

    // Sort by week chronologically
    return Array.from(weekMap.values()).sort((a, b) =>
      (a.week as string).localeCompare(b.week as string)
    );
  }, [indicators, clinicalIndicators, forecastData, forecastStationId, compositeForecast]);

  // Convert events to chart markers, filtered to chart date range
  const eventMarkers = useMemo(() => {
    if (!me.data || !userEvents.data || userEvents.data.length === 0) return [];
    if (chartData.length === 0) return [];
    const firstWeek = chartData[0].week as string;
    const lastWeek = chartData[chartData.length - 1].week as string;

    return userEvents.data
      .map((ev) => {
        const startWeek = dateToISOWeek(new Date(ev.date));
        const endWeek = ev.endDate ? dateToISOWeek(new Date(ev.endDate)) : null;
        const cat = getCategoryByKey(ev.category);
        const color = cat?.color ?? "rgb(156,163,175)";
        const key = `${EVENT_KEY_PREFIX}${ev.category}`;
        if (endWeek) {
          // Range event → ReferenceArea
          const x1 = startWeek < firstWeek ? firstWeek : startWeek;
          const x2 = endWeek > lastWeek ? lastWeek : endWeek;
          if (x1 > x2) return null;
          return { type: "area" as const, x1, x2, color, key };
        } else {
          // Single-day event → ReferenceLine
          if (startWeek < firstWeek || startWeek > lastWeek) return null;
          return { type: "line" as const, x: startWeek, color, key };
        }
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);
  }, [me.data, userEvents.data, chartData]);

  // Determine which event categories have visible markers
  const eventCategoriesInRange = useMemo(() => {
    const categoryKeys = new Set(eventMarkers.map((m) => m.key));
    return EVENT_CATEGORIES.filter((cat) => categoryKeys.has(`${EVENT_KEY_PREFIX}${cat.key}`));
  }, [eventMarkers]);

  // Legend entries: wastewater (solid) + clinical (dashed)
  const legendEntries: LegendEntry[] = useMemo(() => {
    const entries: LegendEntry[] = indicatorStationIds.map((stationId, index) => ({
      key: stationId,
      label: displayNames.get(stationId) ?? stationId,
      color: LINE_COLORS[index % LINE_COLORS.length],
      group: "Eaux usées",
    }));
    // Add clinical entries with dashed style
    for (const diseaseId of enabledDiseases) {
      const meta = CLINICAL_DATASETS[diseaseId];
      entries.push({
        key: `${CLINICAL_KEY_PREFIX}${diseaseId}`,
        label: `${meta.label}${clinicalLabelSuffix}`,
        color: meta.color,
        dashed: true,
        group: "Urgences",
      });
    }
    // Forecast entry
    entries.push({
      key: FORECAST_KEY,
      label: "Prévision (zone grisée = incertitude)",
      color: FORECAST_COLOR,
      dashed: true,
      group: "Prévision",
    });
    // Prediction history entry
    entries.push({
      key: PREDICTION_HISTORY_KEY,
      label: "Prédictions passées",
      color: PREDICTION_HISTORY_COLOR,
      dashed: true,
      group: "Prévision",
    });
    // Event category entries (one per category with events in range)
    for (const cat of eventCategoriesInRange) {
      entries.push({
        key: `${EVENT_KEY_PREFIX}${cat.key}`,
        label: cat.label,
        color: cat.color,
        band: true,
        group: "Personnel",
      });
    }
    return entries;
  }, [indicatorStationIds, displayNames, enabledDiseases, clinicalLabelSuffix, eventCategoriesInRange]);

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
                    // Hide raw data and forecast band entries from tooltip
                    if (key.endsWith("_raw")) return null;
                    if (key === FORECAST_BAND_KEY) return null;

                    const configEntry = fullChartConfig[key];
                    const isClinical = key.startsWith(CLINICAL_KEY_PREFIX);

                    // Forecast: show predicted value + uncertainty range
                    if (key === FORECAST_KEY) {
                      const valueStr =
                        value != null
                          ? Number(value).toLocaleString("fr-FR", { maximumFractionDigits: 0 })
                          : "—";
                      const band = payload?.[FORECAST_BAND_KEY as keyof typeof payload] as unknown as number[] | undefined;
                      const bandStr = band
                        ? `${Number(band[0]).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} – ${Number(band[1]).toLocaleString("fr-FR", { maximumFractionDigits: 0 })}`
                        : null;
                      return (
                        <span className="flex flex-col gap-0.5">
                          <span className="flex items-center gap-2">
                            <svg className="shrink-0" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                              <line x1="0" y1="5" x2="10" y2="5" stroke={FORECAST_COLOR} strokeWidth="2" strokeDasharray="3 1.5" />
                            </svg>
                            <span className="text-muted-foreground">Prévision</span>
                            <span className="font-mono font-medium ml-auto">{valueStr}</span>
                          </span>
                          {bandStr && (
                            <span className="text-muted-foreground ml-5 text-[10px]">
                              Incertitude : {bandStr}
                            </span>
                          )}
                        </span>
                      );
                    }

                    // Prediction history: show past prediction value
                    if (key === PREDICTION_HISTORY_KEY) {
                      const valueStr =
                        value != null
                          ? Number(value).toLocaleString("fr-FR", { maximumFractionDigits: 0 })
                          : "—";
                      return (
                        <span className="flex items-center gap-2">
                          <svg className="shrink-0" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                            <line x1="0" y1="5" x2="10" y2="5" stroke={PREDICTION_HISTORY_COLOR} strokeWidth="2" strokeDasharray="3 1.5" />
                          </svg>
                          <span className="text-muted-foreground">Prédiction passée</span>
                          <span className="font-mono font-medium ml-auto">{valueStr}</span>
                        </span>
                      );
                    }

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

            {/* Composite prediction history (grey dashed, behind real data) */}
            <Line
              type="monotone"
              dataKey={PREDICTION_HISTORY_KEY}
              stroke={PREDICTION_HISTORY_COLOR}
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={false}
              connectNulls
              name={PREDICTION_HISTORY_KEY}
              yAxisId="wastewater"
              hide={hiddenKeys.has(PREDICTION_HISTORY_KEY)}
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

            {/* Forecast confidence band */}
            <Area
              type="monotone"
              dataKey={FORECAST_BAND_KEY}
              stroke="none"
              fill={FORECAST_COLOR}
              fillOpacity={0.15}
              yAxisId="wastewater"
              hide={hiddenKeys.has(FORECAST_KEY)}
              name={FORECAST_BAND_KEY}
              legendType="none"
              isAnimationActive={false}
            />

            {/* Forecast line (grey dashed) */}
            <Line
              type="monotone"
              dataKey={FORECAST_KEY}
              stroke={FORECAST_COLOR}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              connectNulls
              name={FORECAST_KEY}
              yAxisId="wastewater"
              hide={hiddenKeys.has(FORECAST_KEY)}
            />

            {/* Event markers: bands (ReferenceArea) and lines (ReferenceLine) */}
            {eventMarkers.map((marker, i) =>
              marker.type === "area" ? (
                <ReferenceArea
                  key={`event-area-${i}`}
                  x1={marker.x1}
                  x2={marker.x2}
                  yAxisId="wastewater"
                  fill={marker.color}
                  fillOpacity={0.15}
                  stroke={marker.color}
                  strokeOpacity={0.3}
                  ifOverflow="hidden"
                  style={hiddenKeys.has(marker.key) ? { display: "none" } : undefined}
                />
              ) : (
                <ReferenceLine
                  key={`event-line-${i}`}
                  x={marker.x}
                  yAxisId="wastewater"
                  stroke={marker.color}
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  ifOverflow="hidden"
                  style={hiddenKeys.has(marker.key) ? { display: "none" } : undefined}
                />
              )
            )}

            {/* Data update vertical lines (when settings toggle is on) */}
            {showUpdates && updateWeeks.map((u, i) => (
              <ReferenceLine
                key={`update-${i}`}
                x={u.week}
                yAxisId="wastewater"
                stroke="hsl(200, 60%, 70%)"
                strokeWidth={1}
                strokeDasharray="2 4"
                ifOverflow="hidden"
                label={{
                  value: u.label,
                  position: "top",
                  fontSize: 9,
                  fill: "hsl(200, 60%, 60%)",
                }}
              />
            ))}
          </ComposedChart>
        </ChartContainer>
      </div>
      <ChartLegend entries={legendEntries} hiddenKeys={hiddenKeys} onToggle={onToggle} />
    </div>
  );
}
