"use client";

import { useMemo } from "react";
import { Line, XAxis, YAxis, CartesianGrid, ComposedChart, ReferenceLine } from "recharts";
import { CLINICAL_DATASETS } from "@/lib/constants";
import {
  formatWeekLabel,
  formatWeekLabelFull,
  dateToISOWeek,
  LINE_COLORS,
  CLINICAL_KEY_PREFIX,
} from "@/lib/chart-utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { ClinicalDiseaseId } from "@/types/clinical";

interface WastewaterPoint {
  week: string;
  stationId: string;
  value: number | null;
  smoothedValue: number | null;
}

interface ClinicalPoint {
  week: string;
  diseaseId: ClinicalDiseaseId;
  erVisitRate: number | null;
}

interface SnapshotChartProps {
  wastewater: WastewaterPoint[];
  clinical: ClinicalPoint[];
  asOfDate: string;
}

const WASTEWATER_KEY = "national_smoothed";

export function SnapshotChart({ wastewater, clinical, asOfDate }: SnapshotChartProps) {
  const asOfWeek = useMemo(() => dateToISOWeek(new Date(asOfDate)), [asOfDate]);

  const diseaseIds = useMemo(() => {
    const ids = new Set<ClinicalDiseaseId>();
    for (const c of clinical) ids.add(c.diseaseId);
    return Array.from(ids);
  }, [clinical]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {
      [WASTEWATER_KEY]: {
        label: "Covid eaux usées (national)",
        color: LINE_COLORS[0],
      },
    };
    for (const diseaseId of diseaseIds) {
      const meta = CLINICAL_DATASETS[diseaseId];
      config[`${CLINICAL_KEY_PREFIX}${diseaseId}`] = {
        label: meta.label,
        color: meta.color,
      };
    }
    return config;
  }, [diseaseIds]);

  const chartData = useMemo(() => {
    const weekMap = new Map<string, Record<string, string | number | null>>();

    for (const w of wastewater) {
      let point = weekMap.get(w.week);
      if (!point) {
        point = { week: w.week };
        weekMap.set(w.week, point);
      }
      point[WASTEWATER_KEY] = w.smoothedValue;
    }

    for (const c of clinical) {
      let point = weekMap.get(c.week);
      if (!point) {
        point = { week: c.week };
        weekMap.set(c.week, point);
      }
      point[`${CLINICAL_KEY_PREFIX}${c.diseaseId}`] = c.erVisitRate;
    }

    return Array.from(weekMap.values()).sort((a, b) =>
      (a.week as string).localeCompare(b.week as string)
    );
  }, [wastewater, clinical]);

  const hasClinical = diseaseIds.length > 0;

  if (chartData.length === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center rounded-lg border border-dashed sm:h-[300px]">
        <p className="text-muted-foreground text-sm">
          Aucune donnée disponible pour cette date.
        </p>
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[250px] w-full sm:h-[300px]">
      <ComposedChart data={chartData} margin={{ top: 5, right: hasClinical ? 5 : 10, left: 0, bottom: 5 }}>
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
        {hasClinical && (
          <YAxis
            yAxisId="clinical"
            orientation="right"
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => String(Math.round(v * 10) / 10)}
            width={65}
            axisLine={{ strokeDasharray: "6 3" }}
            label={{
              value: "Urgences /100k",
              angle: 90,
              position: "insideRight",
              offset: 10,
              style: { fontSize: 11, fill: "var(--color-muted-foreground, #888)", textAnchor: "middle" },
            }}
          />
        )}
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(label) => formatWeekLabelFull(String(label))}
              formatter={(value, name) => {
                const key = String(name);
                const configEntry = chartConfig[key];
                const isClinical = key.startsWith(CLINICAL_KEY_PREFIX);

                if (isClinical) {
                  const valueStr =
                    value != null
                      ? `${Number(value).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}/100k`
                      : "\u2014";
                  return (
                    <span className="flex items-center gap-2">
                      <svg className="shrink-0" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                        <line x1="0" y1="5" x2="10" y2="5" stroke={configEntry?.color as string} strokeWidth="2" strokeDasharray="3 1.5" />
                      </svg>
                      <span className="text-muted-foreground">{configEntry?.label ?? key}</span>
                      <span className="font-mono font-medium ml-auto">{valueStr}</span>
                    </span>
                  );
                }

                const valueStr =
                  value != null
                    ? Number(value).toLocaleString("fr-FR", { maximumFractionDigits: 2 })
                    : "\u2014";
                return (
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: configEntry?.color as string }}
                    />
                    <span className="text-muted-foreground">{configEntry?.label ?? key}</span>
                    <span className="font-mono font-medium ml-auto">{valueStr}</span>
                  </span>
                );
              }}
            />
          }
        />

        {/* National wastewater smoothed line */}
        <Line
          type="monotone"
          dataKey={WASTEWATER_KEY}
          stroke={LINE_COLORS[0]}
          strokeWidth={2}
          dot={false}
          connectNulls
          name={WASTEWATER_KEY}
          yAxisId="wastewater"
        />

        {/* Clinical overlay lines */}
        {diseaseIds.map((diseaseId) => {
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
            />
          );
        })}

        {/* Vertical reference line at the "as of" date */}
        <ReferenceLine
          x={asOfWeek}
          yAxisId="wastewater"
          stroke="rgb(239, 68, 68)"
          strokeDasharray="4 4"
          strokeWidth={2}
          label={{
            value: "Date",
            position: "top",
            fill: "rgb(239, 68, 68)",
            fontSize: 11,
          }}
        />
      </ComposedChart>
    </ChartContainer>
  );
}
