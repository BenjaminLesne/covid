"use client";

import { useQueryState, parseAsBoolean } from "nuqs";

export function useChartSettings() {
  const [showUpdates, setShowUpdates] = useQueryState(
    "updates",
    parseAsBoolean.withDefault(false).withOptions({ history: "replace" })
  );

  return { showUpdates, setShowUpdates };
}
