/**
 * TypeScript types for clinical surveillance data.
 *
 * Data source: Santé publique France — Odissé API v2.1
 * ER visit rates for Flu, Bronchiolitis, and COVID-19.
 */

/** Supported clinical disease identifiers. */
export type ClinicalDiseaseId = "flu" | "bronchiolitis" | "covid_clinical";

/** A single weekly clinical indicator reading (national ER visit rate). */
export interface ClinicalIndicator {
  /** ISO week string, e.g. "2024-W03" */
  week: string;
  /** Disease identifier */
  diseaseId: ClinicalDiseaseId;
  /** ER visit rate per 100,000 population */
  erVisitRate: number | null;
}

/** Metadata for a clinical dataset (Odissé API configuration). */
export interface ClinicalDatasetMeta {
  /** Disease identifier */
  id: ClinicalDiseaseId;
  /** French display label */
  label: string;
  /** Odissé dataset ID for API requests */
  datasetId: string;
  /** Field name containing the ER visit rate in the API response */
  rateFieldName: string;
  /** Odissé dataset ID for department-level API requests */
  departmentDatasetId: string;
  /** HSL color string for chart rendering */
  color: string;
  /** Age group filter value for the Odissé API query */
  ageFilter: string;
}
