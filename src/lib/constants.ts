import type { SeverityLevel } from "@/types/wastewater";

/**
 * Severity level configuration from PRD Section 7.1.
 * Quintile-based classification of viral indicator values.
 */
export const SEVERITY_LEVELS = {
  1: { label: "Very Low", color: "#22c55e" },
  2: { label: "Low", color: "#84cc16" },
  3: { label: "Moderate", color: "#eab308" },
  4: { label: "High", color: "#f97316" },
  5: { label: "Very High", color: "#ef4444" },
} as const satisfies Record<SeverityLevel, { label: string; color: string }>;

/**
 * Percentile thresholds for severity classification (PRD Section 7.1).
 * A value at or below the Nth percentile falls in the corresponding bucket.
 */
export const PERCENTILE_THRESHOLDS = [20, 40, 60, 80] as const;

/**
 * Trend comparison threshold (PRD Section 7.2).
 * Change > ±TREND_THRESHOLD (10%) = increasing/decreasing, otherwise stable.
 */
export const TREND_THRESHOLD = 0.1;

/** Data revalidation interval in seconds (6 hours). */
export const REVALIDATE_INTERVAL = 21600;

/** Maximum number of stations selectable on the graph (excluding national). */
export const MAX_SELECTED_STATIONS = 5;

/** Station ID used for the national aggregate. */
export const NATIONAL_STATION_ID = "national";

/** SUM'Eau data source URLs. */
export const DATA_URLS = {
  indicators: {
    primary:
      "https://www.data.gouv.fr/api/1/datasets/r/2963ccb5-344d-4978-bdd3-08aaf9efe514",
    fallback:
      "https://odisse.santepubliquefrance.fr/explore/dataset/sum-eau-indicateurs/download?format=json",
  },
  stations: {
    primary:
      "https://www.data.gouv.fr/api/1/datasets/r/dd9cf705-a759-46c6-afd6-bc85cf25f363",
    fallback:
      "https://odisse.santepubliquefrance.fr/explore/dataset/sumeau_stations/download?format=json",
  },
} as const;

/** Default date range: last 6 months. */
export const DEFAULT_DATE_RANGE_MONTHS = 6;
