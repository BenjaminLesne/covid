"use client";

import { useCallback } from "react";
import { useQueryState, createParser } from "nuqs";
import {
  NATIONAL_STATION_ID,
  MAX_SELECTED_STATIONS,
} from "@/lib/constants";

const stationsParser = createParser({
  parse: (v: string) =>
    v.split(",").map((s) => s.trim()).filter(Boolean),
  serialize: (v: string[]) => v.join(","),
  eq: (a: string[], b: string[]) =>
    a.length === b.length && a.every((v, i) => v === b[i]),
}).withDefault([NATIONAL_STATION_ID]).withOptions({ history: "replace" });

export function useStationPreferences() {
  const [selectedIds, setSelectedIds] = useQueryState("stations", stationsParser);

  const addStation = useCallback(
    (stationId: string) => {
      void setSelectedIds((prev) => {
        const withoutNational = prev.filter(
          (id) => id !== NATIONAL_STATION_ID
        );
        if (
          withoutNational.length >= MAX_SELECTED_STATIONS ||
          prev.includes(stationId)
        ) {
          return prev;
        }
        return [...prev, stationId];
      });
    },
    [setSelectedIds]
  );

  const removeStation = useCallback(
    (stationId: string) => {
      if (stationId === NATIONAL_STATION_ID) return;
      void setSelectedIds((prev) => prev.filter((id) => id !== stationId));
    },
    [setSelectedIds]
  );

  const toggleStation = useCallback(
    (stationId: string) => {
      if (stationId === NATIONAL_STATION_ID) return;
      void setSelectedIds((prev) => {
        if (prev.includes(stationId)) {
          return prev.filter((id) => id !== stationId);
        }
        const withoutNational = prev.filter(
          (id) => id !== NATIONAL_STATION_ID
        );
        if (withoutNational.length >= MAX_SELECTED_STATIONS) {
          return prev;
        }
        return [...prev, stationId];
      });
    },
    [setSelectedIds]
  );

  const setStations = useCallback(
    (ids: string[]) => {
      const unique = Array.from(new Set(ids));
      const withNational = unique.includes(NATIONAL_STATION_ID)
        ? unique
        : [NATIONAL_STATION_ID, ...unique];
      const nonNational = withNational.filter(
        (id) => id !== NATIONAL_STATION_ID
      );
      const clamped = [
        NATIONAL_STATION_ID,
        ...nonNational.slice(0, MAX_SELECTED_STATIONS),
      ];
      void setSelectedIds(clamped);
    },
    [setSelectedIds]
  );

  const isSelected = useCallback(
    (stationId: string) => selectedIds.includes(stationId),
    [selectedIds]
  );

  const canAddMore =
    selectedIds.filter((id) => id !== NATIONAL_STATION_ID).length <
    MAX_SELECTED_STATIONS;

  return {
    selectedIds,
    addStation,
    removeStation,
    toggleStation,
    setStations,
    isSelected,
    canAddMore,
  };
}
