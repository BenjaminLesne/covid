/**
 * TypeScript types for SUM'Eau wastewater surveillance data.
 *
 * Data source: Santé publique France — SUM'Eau
 * https://www.data.gouv.fr/datasets/surveillance-du-sars-cov-2-dans-les-eaux-usees-sumeau
 */

/** A single weekly wastewater indicator reading for one station. */
export interface WastewaterIndicator {
  /** ISO week string, e.g. "2024-W03" */
  week: string;
  /** Station SANDRE identifier, or "national" for the national aggregate */
  stationId: string;
  /** Raw viral indicator value (ratio cg/L SARS-CoV-2 / mg N/L ammonium) */
  value: number | null;
  /** GAM-smoothed trend value */
  smoothedValue: number | null;
}

/** Metadata for a wastewater monitoring station. */
export interface Station {
  /** Station display name */
  name: string;
  /** Commune (city) where the station is located */
  commune: string;
  /** SANDRE unique identifier */
  sandreId: string;
  /** Population served by this station */
  population: number;
  /** Geographic latitude (WGS84) */
  lat: number;
  /** Geographic longitude (WGS84) */
  lng: number;
}

/** National aggregate time-series data point. */
export interface NationalAggregate {
  /** ISO week string, e.g. "2024-W03" */
  week: string;
  /** Population-weighted national average (raw) */
  value: number | null;
  /** GAM-smoothed national trend value */
  smoothedValue: number | null;
}

/** Severity level from 1 (Very Low) to 5 (Very High). */
export type SeverityLevel = 1 | 2 | 3 | 4 | 5;

/** Trend direction based on 2-week comparison. */
export type TrendDirection = "increasing" | "stable" | "decreasing";

/** Severity classification result for a station or national aggregate. */
export interface SeverityClassification {
  level: SeverityLevel;
  label: string;
  color: string;
  trend: TrendDirection;
}
