"use client";

import { CircleMarker, Tooltip } from "react-leaflet";
import type { Station, SeverityLevel, TrendDirection } from "@/types/wastewater";
import { getSeverityColor } from "@/lib/severity";

interface StationMarkerProps {
  station: Station;
  severityLevel: SeverityLevel;
  trend: TrendDirection;
}

const TREND_ARROWS: Record<TrendDirection, string> = {
  increasing: "\u2191",
  stable: "\u2192",
  decreasing: "\u2193",
};

export function StationMarker({
  station,
  severityLevel,
  trend,
}: StationMarkerProps) {
  const color = getSeverityColor(severityLevel);

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
          <br />
          <span style={{ color }}>{TREND_ARROWS[trend]}</span>
        </div>
      </Tooltip>
    </CircleMarker>
  );
}
