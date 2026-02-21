"use client";

import { useMemo, useCallback } from "react";
import { useQueryStates, createParser } from "nuqs";
import { DEFAULT_DATE_RANGE_MONTHS } from "@/lib/constants";

export interface DateRange {
  from: string; // ISO date string (YYYY-MM-DD)
  to: string; // ISO date string (YYYY-MM-DD)
  preset?: number; // months back from today
}

function computeRange(months: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - months);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

const rangeParser = createParser({
  parse: (v: string) => {
    const m = /^(\d+)m$/.exec(v);
    if (!m) return null;
    const n = parseInt(m[1], 10);
    return n > 0 ? n : null;
  },
  serialize: (v: number) => `${v}m`,
});

const isoDateParser = createParser({
  parse: (v: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
    return isNaN(new Date(v).getTime()) ? null : v;
  },
  serialize: (v: string) => v,
});

export function useDateRange() {
  const [params, setParams] = useQueryStates(
    {
      range: rangeParser,
      from: isoDateParser,
      to: isoDateParser,
    },
    { history: "replace" }
  );

  const dateRange: DateRange = useMemo(() => {
    if (params.range != null) {
      return { ...computeRange(params.range), preset: params.range };
    }
    if (params.from && params.to) {
      return { from: params.from, to: params.to };
    }
    return {
      ...computeRange(DEFAULT_DATE_RANGE_MONTHS),
      preset: DEFAULT_DATE_RANGE_MONTHS,
    };
  }, [params.range, params.from, params.to]);

  const fromDate = useMemo(() => new Date(dateRange.from), [dateRange.from]);
  const toDate = useMemo(() => new Date(dateRange.to), [dateRange.to]);

  const setRange = useCallback(
    (from: Date, to: Date) => {
      void setParams({
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
        range: null,
      });
    },
    [setParams]
  );

  const setPreset = useCallback(
    (months: number) => {
      void setParams({ range: months, from: null, to: null });
    },
    [setParams]
  );

  const reset = useCallback(() => {
    void setParams({ range: null, from: null, to: null });
  }, [setParams]);

  return { dateRange, fromDate, toDate, setRange, setPreset, preset: dateRange.preset, reset };
}
