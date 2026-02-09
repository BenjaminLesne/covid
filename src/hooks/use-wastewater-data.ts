/**
 * React Query hooks for wastewater data fetching.
 *
 * Replaces tRPC wastewater queries with direct client-side fetching.
 */

import { useQuery } from "@tanstack/react-query";
import { fetchIndicators, fetchStations } from "@/services/wastewater";
import type { NationalAggregate, WastewaterIndicator } from "@/types/wastewater";
import { useMemo } from "react";

const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const NATIONAL_COLUMN = "National_54";

/** Fetch all station metadata. */
export function useStations() {
  return useQuery({
    queryKey: ["stations"],
    queryFn: fetchStations,
    staleTime: STALE_TIME,
    retry: 1,
  });
}

interface UseIndicatorsOptions {
  stationIds?: string[];
  dateRange?: { from: string; to: string };
}

/** Fetch wastewater indicators, optionally filtered by station IDs and date range. */
export function useIndicators(options?: UseIndicatorsOptions) {
  const query = useQuery({
    queryKey: ["indicators"],
    queryFn: fetchIndicators,
    staleTime: STALE_TIME,
    retry: 1,
  });

  const filtered = useMemo(() => {
    if (!query.data) return undefined;

    let indicators: WastewaterIndicator[] = query.data;

    if (options?.stationIds && options.stationIds.length > 0) {
      const ids = new Set(options.stationIds);
      indicators = indicators.filter((ind) => ids.has(ind.stationId));
    }

    if (options?.dateRange) {
      const { from, to } = options.dateRange;
      indicators = indicators.filter(
        (ind) => ind.week >= from && ind.week <= to
      );
    }

    return indicators;
  }, [query.data, options?.stationIds, options?.dateRange]);

  return {
    ...query,
    data: filtered,
  };
}

/** Fetch national aggregate trend (National_54 station). */
export function useNationalTrend() {
  const query = useQuery({
    queryKey: ["indicators"],
    queryFn: fetchIndicators,
    staleTime: STALE_TIME,
    retry: 1,
  });

  const national = useMemo(() => {
    if (!query.data) return undefined;

    const trend: NationalAggregate[] = query.data
      .filter((ind) => ind.stationId === NATIONAL_COLUMN)
      .map((ind) => ({
        week: ind.week,
        value: ind.value,
        smoothedValue: ind.smoothedValue,
      }))
      .sort((a, b) => a.week.localeCompare(b.week));

    return trend;
  }, [query.data]);

  return {
    ...query,
    data: national,
  };
}
