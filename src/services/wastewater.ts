/**
 * Client-side wastewater data fetching service.
 *
 * Fetches SUM'Eau indicator data and station metadata directly from
 * the browser using data.gouv.fr CSV endpoints.
 */

import Papa from "papaparse";
import type { WastewaterIndicator, Station } from "@/types/wastewater";
import { DATA_URLS } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripQuotes(raw: string): string {
  return raw.replace(/^['"]+|['"]+$/g, "");
}

function parseFrenchNumber(raw: string): number | null {
  if (!raw || raw.trim() === "" || raw.trim() === "NA") return null;
  const normalized = raw.replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function normalizeWeek(raw: string): string {
  return raw.replace("-S", "-W");
}

function isStationColumn(col: string): boolean {
  const metaCols = ["semaine"];
  return !metaCols.includes(col.toLowerCase());
}

// ---------------------------------------------------------------------------
// CSV Parsing — Indicators (wide → long)
// ---------------------------------------------------------------------------

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
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch wastewater indicator data from data.gouv.fr.
 * Uses browser-native fetch with a 15-second timeout.
 */
export async function fetchIndicators(): Promise<WastewaterIndicator[]> {
  const res = await fetch(DATA_URLS.indicators.primary, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch indicators: ${res.status} ${res.statusText}`);
  }
  const csvText = await res.text();
  return parseIndicatorsCsv(csvText);
}

/**
 * Fetch station metadata from data.gouv.fr.
 * Uses browser-native fetch with a 15-second timeout.
 */
export async function fetchStations(): Promise<Station[]> {
  const res = await fetch(DATA_URLS.stations.primary, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch stations: ${res.status} ${res.statusText}`);
  }
  const csvText = await res.text();
  return parseStationsCsv(csvText);
}
