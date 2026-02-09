/**
 * SUM'Eau data fetching service.
 *
 * Fetches wastewater indicator data and station metadata from government APIs.
 * Primary source: data.gouv.fr CSV endpoints
 * Fallback: Odissé (Santé publique France) JSON endpoints
 */

import Papa from "papaparse";
import type { WastewaterIndicator, Station } from "@/types/wastewater";
import { DATA_URLS, REVALIDATE_INTERVAL } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip wrapping quotes (single or double) that the CSV parser may leave. */
function stripQuotes(raw: string): string {
  return raw.replace(/^['"]+|['"]+$/g, "");
}

/** Convert a French-locale number string (comma decimal) to a number or null. */
function parseFrenchNumber(raw: string): number | null {
  if (!raw || raw.trim() === "" || raw.trim() === "NA") return null;
  const normalized = raw.replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/**
 * Normalize the week string from the CSV (`YYYY-SWW`) to ISO-week format
 * (`YYYY-WWW`). E.g. "2024-S03" → "2024-W03".
 */
function normalizeWeek(raw: string): string {
  return raw.replace("-S", "-W");
}

/**
 * Determine if a column name is a station column (not metadata).
 * Excludes known non-station columns.
 */
function isStationColumn(col: string): boolean {
  const metaCols = ["semaine"];
  return !metaCols.includes(col.toLowerCase());
}

// ---------------------------------------------------------------------------
// CSV Parsing — Indicators (wide → long)
// ---------------------------------------------------------------------------

/** Row shape from the wide-format indicators CSV. */
type IndicatorCsvRow = Record<string, string>;

function parseIndicatorsCsv(csvText: string): WastewaterIndicator[] {
  const parsed = Papa.parse<IndicatorCsvRow>(csvText, {
    header: true,
    delimiter: ";",
    skipEmptyLines: true,
  });

  const indicators: WastewaterIndicator[] = [];
  const headers = parsed.meta.fields ?? [];
  const stationCols = headers.filter(isStationColumn);

  for (const row of parsed.data) {
    const weekRaw = row["semaine"];
    if (!weekRaw) continue;
    const week = normalizeWeek(weekRaw.trim());

    for (const col of stationCols) {
      const value = parseFrenchNumber(row[col]);
      // The CSV contains smoothed values directly.
      // We store as `value` and leave `smoothedValue` as the same
      // since the CSV doesn't distinguish raw vs. smoothed.
      indicators.push({
        week,
        stationId: col,
        value,
        smoothedValue: value,
      });
    }
  }

  return indicators;
}

// ---------------------------------------------------------------------------
// CSV Parsing — Stations
// ---------------------------------------------------------------------------

interface StationCsvRow {
  nom: string;
  sandre: string;
  commune: string;
  population: string;
  longitude: string;
  latitude: string;
}

function parseStationsCsv(csvText: string): Station[] {
  const parsed = Papa.parse<StationCsvRow>(csvText, {
    header: true,
    delimiter: ";",
    skipEmptyLines: true,
  });

  return parsed.data
    .filter((row) => row.nom && row.sandre)
    .map((row) => ({
      name: row.nom.trim(),
      commune: row.commune?.trim() ?? "",
      sandreId: stripQuotes(row.sandre.trim()),
      population: parseInt(row.population, 10) || 0,
      lat: parseFrenchNumber(row.latitude) ?? 0,
      lng: parseFrenchNumber(row.longitude) ?? 0,
    }));
}

// ---------------------------------------------------------------------------
// JSON Fallback Parsing — Indicators
// ---------------------------------------------------------------------------

interface OdisseIndicatorRecord {
  fields: Record<string, unknown> & {
    semaine: string;
  };
}

function parseIndicatorsJson(
  records: OdisseIndicatorRecord[]
): WastewaterIndicator[] {
  const indicators: WastewaterIndicator[] = [];

  for (const record of records) {
    const { semaine, ...stationFields } = record.fields;
    if (!semaine) continue;
    const week = normalizeWeek(semaine);

    for (const [key, val] of Object.entries(stationFields)) {
      // Skip non-station metadata fields
      if (key === "date_complet") continue;

      const numVal = typeof val === "number" ? val : null;
      indicators.push({
        week,
        stationId: key,
        value: numVal,
        smoothedValue: numVal,
      });
    }
  }

  return indicators;
}

// ---------------------------------------------------------------------------
// JSON Fallback Parsing — Stations
// ---------------------------------------------------------------------------

interface OdisseStationRecord {
  fields: {
    nom: string;
    sandre: string;
    commune: string;
    population: number;
    latitude: string;
    longitude: string;
    centroide?: [number, number];
  };
  geometry?: {
    coordinates: [number, number];
  };
}

function parseStationsJson(records: OdisseStationRecord[]): Station[] {
  return records
    .filter((r) => r.fields.nom && r.fields.sandre)
    .map((r) => {
      const f = r.fields;
      // Prefer centroide (proper floats) over French-locale lat/lng strings
      const lat = f.centroide?.[0] ?? parseFrenchNumber(f.latitude) ?? 0;
      const lng = f.centroide?.[1] ?? parseFrenchNumber(f.longitude) ?? 0;
      return {
        name: f.nom.trim(),
        commune: f.commune?.trim() ?? "",
        sandreId: stripQuotes(f.sandre.trim()),
        population: f.population ?? 0,
        lat,
        lng,
      };
    });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch wastewater indicator data from SUM'Eau.
 * Tries the data.gouv.fr CSV first, falls back to the Odissé JSON endpoint.
 */
export async function fetchIndicators(): Promise<WastewaterIndicator[]> {
  // Try primary CSV endpoint
  try {
    const res = await fetch(DATA_URLS.indicators.primary, {
      next: { revalidate: REVALIDATE_INTERVAL },
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) {
      const csvText = await res.text();
      return parseIndicatorsCsv(csvText);
    }
  } catch {
    // Fall through to fallback
  }

  // Fallback: Odissé JSON
  const res = await fetch(DATA_URLS.indicators.fallback, {
    next: { revalidate: REVALIDATE_INTERVAL },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(
      `Failed to fetch indicators from both primary and fallback endpoints`
    );
  }
  const json: OdisseIndicatorRecord[] = await res.json();
  return parseIndicatorsJson(json);
}

/**
 * Fetch station metadata from SUM'Eau.
 * Tries the data.gouv.fr CSV first, falls back to the Odissé JSON endpoint.
 */
export async function fetchStations(): Promise<Station[]> {
  // Try primary CSV endpoint
  try {
    const res = await fetch(DATA_URLS.stations.primary, {
      next: { revalidate: REVALIDATE_INTERVAL },
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) {
      const csvText = await res.text();
      return parseStationsCsv(csvText);
    }
  } catch {
    // Fall through to fallback
  }

  // Fallback: Odissé JSON
  const res = await fetch(DATA_URLS.stations.fallback, {
    next: { revalidate: REVALIDATE_INTERVAL },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(
      `Failed to fetch stations from both primary and fallback endpoints`
    );
  }
  const json: OdisseStationRecord[] = await res.json();
  return parseStationsJson(json);
}
