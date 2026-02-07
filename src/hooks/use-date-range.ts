"use client";

import { useMemo } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { DEFAULT_DATE_RANGE_MONTHS } from "@/lib/constants";

export interface DateRange {
  from: string; // ISO date string (YYYY-MM-DD)
  to: string; // ISO date string (YYYY-MM-DD)
}

function getDefaultDateRange(): DateRange {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - DEFAULT_DATE_RANGE_MONTHS);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function useDateRange() {
  const defaultRange = useMemo(() => getDefaultDateRange(), []);
  const [dateRange, setDateRange] = useLocalStorage<DateRange>(
    "eauxvid:date-range",
    defaultRange
  );

  const fromDate = useMemo(() => new Date(dateRange.from), [dateRange.from]);
  const toDate = useMemo(() => new Date(dateRange.to), [dateRange.to]);

  const setRange = (from: Date, to: Date) => {
    setDateRange({
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    });
  };

  const reset = () => {
    setDateRange(getDefaultDateRange());
  };

  return {
    dateRange,
    fromDate,
    toDate,
    setRange,
    reset,
  };
}
