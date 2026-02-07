"use client";

import { CircleMarker, Popup, Tooltip } from "react-leaflet";
import type { Station, SeverityLevel, TrendDirection } from "@/types/wastewater";
import { getSeverityColor } from "@/lib/severity";
import { SEVERITY_LEVELS } from "@/lib/constants";

export interface StationMarkerProps {
  station: Station;
  severityLevel: SeverityLevel;
  trend: TrendDirection;
  isSelected: boolean;
  canAddMore: boolean;
}

const TREND_ARROWS: Record<TrendDirection, string> = {
  increasing: "\u2191",
  stable: "\u2192",
  decreasing: "\u2193",
};

const TREND_LABELS: Record<TrendDirection, string> = {
  increasing: "En hausse",
  stable: "Stable",
  decreasing: "En baisse",
};

export function StationMarker({
  station,
  severityLevel,
  trend,
  isSelected,
  canAddMore,
}: StationMarkerProps) {
  const color = getSeverityColor(severityLevel);
  const { label: severityLabel } = SEVERITY_LEVELS[severityLevel];
  const disabled = !isSelected && !canAddMore;

  return (
    <CircleMarker
      center={[station.lat, station.lng]}
      radius={8}
      pathOptions={{
        fillColor: color,
        fillOpacity: 0.85,
        color: "#fff",
        weight: 2,
      }}
    >
      <Tooltip direction="top" offset={[0, -8]}>
        <div className="text-center text-xs">
          <strong>{station.name}</strong>
          <br />
          {station.commune}
        </div>
      </Tooltip>
      <Popup>
        <div className="min-w-[180px] text-sm">
          <p className="mb-1 text-base font-semibold">{station.name}</p>
          <p className="text-muted-foreground mb-2 text-xs">
            {station.commune}
          </p>
          <div className="mb-3 flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="font-medium" style={{ color }}>
              {severityLabel}
            </span>
            <span style={{ color }}>{TREND_ARROWS[trend]}</span>
            <span className="text-muted-foreground text-xs">
              {TREND_LABELS[trend]}
            </span>
          </div>
          <button
            data-station-toggle={station.sandreId}
            type="button"
            disabled={disabled}
            className={`w-full rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              isSelected
                ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                : disabled
                  ? "cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                  : "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
            }`}
            title={disabled ? "Maximum 5 stations atteint" : undefined}
          >
            {isSelected ? "Retirer du graphique" : "Ajouter au graphique"}
          </button>
        </div>
      </Popup>
    </CircleMarker>
  );
}
