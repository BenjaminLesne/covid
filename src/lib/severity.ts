import type { SeverityLevel, TrendDirection } from "@/types/wastewater";
import { PERCENTILE_THRESHOLDS, SEVERITY_LEVELS, TREND_THRESHOLD } from "@/lib/constants";

/**
 * Calculate the severity level (1–5) based on quintile thresholds.
 *
 * Computes percentiles from historical values and classifies the current
 * value into one of 5 severity buckets using the configured percentile
 * thresholds (20th, 40th, 60th, 80th).
 *
 * Returns level 3 (Moderate) if historical data is empty or currentValue is null.
 */
export function calculateSeverityLevel(
  currentValue: number | null,
  historicalValues: (number | null)[]
): SeverityLevel {
  if (currentValue === null) return 3;

  const valid = historicalValues.filter((v): v is number => v !== null);
  if (valid.length === 0) return 3;

  const sorted = [...valid].sort((a, b) => a - b);

  const percentile = (p: number): number => {
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  };

  const [p20, p40, p60, p80] = PERCENTILE_THRESHOLDS.map((t) => percentile(t));

  if (currentValue <= p20) return 1;
  if (currentValue <= p40) return 2;
  if (currentValue <= p60) return 3;
  if (currentValue <= p80) return 4;
  return 5;
}

/**
 * Calculate trend direction by comparing the current value to a value
 * from two weeks ago. Uses ±10% threshold from constants.
 *
 * Returns "stable" if either value is null.
 */
export function calculateTrend(
  currentValue: number | null,
  twoWeeksAgoValue: number | null
): TrendDirection {
  if (currentValue === null || twoWeeksAgoValue === null) return "stable";
  if (twoWeeksAgoValue === 0) {
    if (currentValue > 0) return "increasing";
    if (currentValue < 0) return "decreasing";
    return "stable";
  }

  const change = (currentValue - twoWeeksAgoValue) / Math.abs(twoWeeksAgoValue);

  if (change > TREND_THRESHOLD) return "increasing";
  if (change < -TREND_THRESHOLD) return "decreasing";
  return "stable";
}

/**
 * Get the hex color associated with a severity level.
 */
export function getSeverityColor(level: SeverityLevel): string {
  return SEVERITY_LEVELS[level].color;
}
