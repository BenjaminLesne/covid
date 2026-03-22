"use client";

import { useCallback } from "react";
import { useQueryState, createParser } from "nuqs";

const isoDateParser = createParser({
  parse: (v: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
    return isNaN(new Date(v).getTime()) ? null : v;
  },
  serialize: (v: string) => v,
});

export function useAsOfDate() {
  const [asOfDate, setAsOfDate] = useQueryState("asOf", isoDateParser);

  const resetAsOfDate = useCallback(() => {
    void setAsOfDate(null);
  }, [setAsOfDate]);

  return { asOfDate, setAsOfDate, resetAsOfDate };
}
