"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { useStations, useIndicators } from "@/hooks/use-wastewater-data";
import { calculateSeverityLevel, calculateTrend } from "@/lib/severity";
import { StationMarker } from "./station-marker";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryError } from "@/components/query-error";
import type { SeverityLevel, TrendDirection } from "@/types/wastewater";

/** Default center and zoom for mainland France. */
const FRANCE_CENTER = [46.6, 2.5] as [number, number];
const FRANCE_ZOOM = 6;

interface StationSeverity {
  stationId: string;
  level: SeverityLevel;
  trend: TrendDirection;
}

export interface FranceMapInnerProps {
  selectedIds: string[];
  canAddMore: boolean;
  onToggle: (stationId: string) => void;
}

/**
 * Single map-level handler that delegates popup button clicks.
 *
 * React-leaflet renders <Popup> content via a portal into Leaflet-managed DOM.
 * Leaflet calls L.DomEvent.disableClickPropagation on the popup container,
 * which prevents clicks from reaching React's delegation root.
 *
 * The React portal renders *after* Leaflet fires `popupopen`, so we use a
 * MutationObserver to detect when the toggle button appears in the popup
 * container, then attach a native click handler.
 */
function PopupClickHandler({
  onToggle,
}: {
  onToggle: (stationId: string) => void;
}) {
  const map = useMap();
  const onToggleRef = useRef(onToggle);

  useEffect(() => {
    onToggleRef.current = onToggle;
  });

  useEffect(() => {
    let observer: MutationObserver | null = null;
    let currentHandler: ((e: MouseEvent) => void) | null = null;
    let currentBtn: HTMLButtonElement | null = null;

    function attachHandler(btn: HTMLButtonElement) {
      // Remove previous handler if any
      if (currentBtn && currentHandler) {
        currentBtn.removeEventListener("click", currentHandler);
      }
      currentBtn = btn;
      currentHandler = (e: MouseEvent) => {
        e.stopPropagation();
        const stationId = btn.getAttribute("data-station-toggle");
        if (stationId && !btn.disabled) {
          onToggleRef.current(stationId);
          // Close the popup after toggle so it reopens with fresh state
          map.closePopup();
        }
      };
      btn.addEventListener("click", currentHandler);
    }

    function onPopupOpen() {
      const container = map.getContainer();

      // The button may already be rendered (unlikely) or arrive later via React portal
      const existing = container.querySelector<HTMLButtonElement>(
        "button[data-station-toggle]"
      );
      if (existing) {
        attachHandler(existing);
        return;
      }

      // Watch for the button to appear
      observer = new MutationObserver(() => {
        const btn = container.querySelector<HTMLButtonElement>(
          "button[data-station-toggle]"
        );
        if (btn) {
          observer?.disconnect();
          observer = null;
          attachHandler(btn);
        }
      });
      observer.observe(container, { childList: true, subtree: true });
    }

    function onPopupClose() {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (currentBtn && currentHandler) {
        currentBtn.removeEventListener("click", currentHandler);
        currentBtn = null;
        currentHandler = null;
      }
    }

    map.on("popupopen", onPopupOpen);
    map.on("popupclose", onPopupClose);
    return () => {
      map.off("popupopen", onPopupOpen);
      map.off("popupclose", onPopupClose);
      onPopupClose();
    };
  }, [map]);

  return null;
}

export function FranceMapInner({
  selectedIds,
  canAddMore,
  onToggle,
}: FranceMapInnerProps) {
  const { data: stations, isLoading: stationsLoading, isError: stationsError, refetch: refetchStations } =
    useStations();

  const { data: indicators, isLoading: indicatorsLoading } =
    useIndicators();

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
    return <Skeleton className="h-[400px] w-full rounded-lg md:h-[450px] lg:h-[500px]" />;
  }

  if (stationsError) {
    return (
      <QueryError
        message="Impossible de charger la carte. Veuillez réessayer."
        onRetry={() => void refetchStations()}
        className="h-[400px] md:h-[450px] lg:h-[500px]"
      />
    );
  }

  if (!stations || stations.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed md:h-[450px] lg:h-[500px]">
        <p className="text-muted-foreground text-sm">
          Aucune station disponible.
        </p>
      </div>
    );
  }

  return (
    <div className="isolate h-[400px] w-full overflow-hidden rounded-lg border md:h-[450px] lg:h-[500px]">
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
        <PopupClickHandler onToggle={onToggle} />
        {stations.map((station) => {
          const severity = stationSeverities.get(station.sandreId);
          if (!severity) return null;
          return (
            <StationMarker
              key={station.sandreId}
              station={station}
              severityLevel={severity.level}
              trend={severity.trend}
              isSelected={selectedIds.includes(station.sandreId)}
              canAddMore={canAddMore}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
