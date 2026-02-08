"use client";

import { useCallback } from "react";
import { useLocalStorage } from "./use-local-storage";
import {
  NATIONAL_STATION_ID,
  MAX_SELECTED_STATIONS,
} from "@/lib/constants";

const STORAGE_KEY = "eauxvid:selected-stations";

/**
 * Hook for managing selected station IDs.
 * National average is always included and cannot be removed.
 * Maximum of MAX_SELECTED_STATIONS additional stations can be selected.
 */
export function useStationPreferences() {
  const [selectedIds, setSelectedIds] = useLocalStorage<string[]>(
    STORAGE_KEY,
    [NATIONAL_STATION_ID]
  );

  const addStation = useCallback(
    (stationId: string) => {
      setSelectedIds((prev) => {
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
      if (stationId === NATIONAL_STATION_ID) return; // Cannot remove national
      setSelectedIds((prev) => prev.filter((id) => id !== stationId));
    },
    [setSelectedIds]
  );

  const toggleStation = useCallback(
    (stationId: string) => {
      if (stationId === NATIONAL_STATION_ID) return;
      setSelectedIds((prev) => {
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
      setSelectedIds(clamped);
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
