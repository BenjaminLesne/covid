/**
 * TypeScript types for rougeole (measles) surveillance data.
 *
 * Data source: Santé publique France — Odissé API v2.1
 * Mandatory notification data (déclarations obligatoires).
 */

/** A single yearly rougeole indicator from the Odissé API. */
export interface RougeoleIndicator {
  /** Year string, e.g. "2023" */
  annee: string;
  /** Department code, e.g. "75" */
  dep: string;
  /** Department name, e.g. "Paris" */
  libgeo: string;
  /** Notification rate per 100,000 population */
  tx: number | null;
  /** Number of cases */
  rou: number | null;
  /** Department population */
  population: number | null;
}
