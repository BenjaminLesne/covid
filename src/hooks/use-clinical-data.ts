/**
 * React Query hooks for clinical surveillance data fetching.
 *
 * Replaces tRPC clinical queries with direct client-side fetching.
 */

import { useQuery } from "@tanstack/react-query";
import {
  fetchClinicalIndicators,
  fetchClinicalIndicatorsByDisease,
} from "@/services/clinical";
import type { ClinicalDiseaseId, ClinicalIndicator } from "@/types/clinical";
import { useMemo } from "react";

const STALE_TIME = 5 * 60 * 1000; // 5 minutes

interface UseClinicalIndicatorsOptions {
  diseaseIds?: ClinicalDiseaseId[];
  dateRange?: { from: string; to: string };
  department?: string;
}

/** Fetch clinical indicators, optionally filtered by disease IDs, department, and date range. */
export function useClinicalIndicators(
  options?: UseClinicalIndicatorsOptions
) {
  const department = options?.department;
  const diseaseIds = options?.diseaseIds;

  const query = useQuery({
    queryKey: ["clinical-indicators", diseaseIds, department],
    queryFn: () => {
      if (diseaseIds && diseaseIds.length > 0) {
        return fetchClinicalIndicatorsByDisease(diseaseIds, department);
      }
      return fetchClinicalIndicators(department);
    },
    staleTime: STALE_TIME,
    retry: 1,
  });

  const filtered = useMemo(() => {
    if (!query.data) return undefined;

    let indicators: ClinicalIndicator[] = query.data;

    if (options?.dateRange) {
      const { from, to } = options.dateRange;
      indicators = indicators.filter(
        (ind) => ind.week >= from && ind.week <= to
      );
    }

    return indicators;
  }, [query.data, options?.dateRange]);

  return {
    ...query,
    data: filtered,
  };
}
