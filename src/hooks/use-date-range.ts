"use client";

import { useMemo, useCallback } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { DEFAULT_DATE_RANGE_MONTHS } from "@/lib/constants";

export interface DateRange {
  from: string; // ISO date string (YYYY-MM-DD)
  to: string; // ISO date string (YYYY-MM-DD)
  /** When set, dates are recomputed relative to today on each load. */
  preset?: number; // months back from today
}

function computeRange(months: number): DateRange {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - months);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    preset: months,
  };
}

function resolveStoredRange(stored: DateRange): DateRange {
  if (stored.preset != null) {
    return computeRange(stored.preset);
  }
  return stored;
}

export function useDateRange() {
  const defaultRange = useMemo(() => computeRange(DEFAULT_DATE_RANGE_MONTHS), []);
  const [storedRange, setStoredRange] = useLocalStorage<DateRange>(
    "eauxvid:date-range",
    defaultRange
  );

  const dateRange = useMemo(() => resolveStoredRange(storedRange), [storedRange]);

  const fromDate = useMemo(() => new Date(dateRange.from), [dateRange.from]);
  const toDate = useMemo(() => new Date(dateRange.to), [dateRange.to]);

  const setRange = useCallback((from: Date, to: Date) => {
    setStoredRange({
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    });
  }, [setStoredRange]);

  const setPreset = useCallback((months: number) => {
    setStoredRange(computeRange(months));
  }, [setStoredRange]);

  const reset = useCallback(() => {
    setStoredRange(computeRange(DEFAULT_DATE_RANGE_MONTHS));
  }, [setStoredRange]);

  return {
    dateRange,
    fromDate,
    toDate,
    setRange,
    setPreset,
    preset: storedRange.preset,
    reset,
  };
}
