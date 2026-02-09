/**
 * Client-side clinical surveillance data fetching service.
 *
 * Fetches ER visit rate data for Flu, Bronchiolitis, and COVID-19
 * directly from the Santé publique France Odissé API v2.1.
 *
 * Uses Promise.allSettled for parallel fetching so that failure of one
 * disease API does not block others from returning data.
 */

import type { ClinicalDiseaseId, ClinicalIndicator } from "@/types/clinical";
import {
  CLINICAL_DATASETS,
  CLINICAL_DISEASE_IDS,
  ODISSE_API_BASE,
} from "@/lib/constants";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeWeek(raw: string): string {
  return raw.replace("-S", "-W");
}

// ---------------------------------------------------------------------------
// Odissé API v2.1 response shape
// ---------------------------------------------------------------------------

interface OdisseV2Response {
  total_count: number;
  results: Record<string, unknown>[];
}

// ---------------------------------------------------------------------------
// Per-disease fetching
// ---------------------------------------------------------------------------

async function fetchSingleDisease(
  diseaseId: ClinicalDiseaseId,
  department?: string
): Promise<ClinicalIndicator[]> {
  const meta = CLINICAL_DATASETS[diseaseId];

  const datasetId = department ? meta.departmentDatasetId : meta.datasetId;

  const url = new URL(`${ODISSE_API_BASE}/${datasetId}/records`);
  const whereClause = department
    ? `sursaud_cl_age_gene='${meta.ageFilter}' AND dep='${department}'`
    : `sursaud_cl_age_gene='${meta.ageFilter}'`;
  url.searchParams.set("where", whereClause);
  url.searchParams.set("select", `semaine,${meta.rateFieldName}`);
  url.searchParams.set("order_by", "semaine ASC");
  url.searchParams.set("limit", "100");

  const indicators: ClinicalIndicator[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    url.searchParams.set("offset", String(offset));

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      throw new Error(
        `Odissé API error for ${diseaseId}: ${res.status} ${res.statusText}`
      );
    }

    const json: OdisseV2Response = await res.json();

    for (const record of json.results) {
      const weekRaw = record["semaine"];
      if (typeof weekRaw !== "string" || !weekRaw) continue;

      const rateRaw = record[meta.rateFieldName];
      const erVisitRate =
        typeof rateRaw === "number" && Number.isFinite(rateRaw)
          ? rateRaw
          : null;

      indicators.push({
        week: normalizeWeek(weekRaw),
        diseaseId,
        erVisitRate,
      });
    }

    offset += json.results.length;
    hasMore = json.results.length === 100 && offset < json.total_count;
  }

  return indicators;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch clinical indicators for all 3 diseases in parallel.
 * Uses Promise.allSettled so that failure of one disease does not block others.
 * Returns ClinicalIndicator[] sorted by week.
 */
export async function fetchClinicalIndicators(
  department?: string
): Promise<ClinicalIndicator[]> {
  return fetchClinicalIndicatorsByDisease([...CLINICAL_DISEASE_IDS], department);
}

/**
 * Fetch clinical indicators for specific diseases in parallel.
 * Uses Promise.allSettled — failed fetches log a warning and contribute no data.
 * Returns ClinicalIndicator[] sorted by week.
 */
export async function fetchClinicalIndicatorsByDisease(
  diseaseIds: ClinicalDiseaseId[],
  department?: string
): Promise<ClinicalIndicator[]> {
  const results = await Promise.allSettled(
    diseaseIds.map((id) => fetchSingleDisease(id, department))
  );

  const indicators: ClinicalIndicator[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      indicators.push(...result.value);
    } else {
      console.warn(
        `Failed to fetch clinical data for ${diseaseIds[i]}:`,
        result.reason
      );
    }
  }

  indicators.sort((a, b) => a.week.localeCompare(b.week));

  return indicators;
}
