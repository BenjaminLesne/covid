"use client";

import { useEffect, useRef } from "react";
import { CLINICAL_DISEASE_IDS } from "@/lib/constants";
import type { DateRange } from "@/hooks/use-date-range";
import type { ClinicalDiseaseId } from "@/types/clinical";

// ---------------------------------------------------------------------------
// Parse helpers
// ---------------------------------------------------------------------------

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDateParam(value: string | null): string | null {
  if (!value || !ISO_DATE_RE.test(value)) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return value;
}

function parseStationsParam(value: string | null): string[] | null {
  if (value === null) return null;
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseClinicalParam(value: string | null): ClinicalDiseaseId[] | null {
  if (value === null) return null;
  if (value === "") return [];
  const ids = value
    .split(",")
    .map((s) => s.trim())
    .filter((id) =>
      (CLINICAL_DISEASE_IDS as readonly string[]).includes(id)
    ) as ClinicalDiseaseId[];
  return ids;
}

// ---------------------------------------------------------------------------
// Serialize helper
// ---------------------------------------------------------------------------

function parseHiddenParam(value: string | null): string[] | null {
  if (value === null) return null;
  if (value === "") return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseDepartmentParam(value: string | null): string | null {
  if (!value || value.trim() === "") return null;
  return value.trim();
}

function buildSearchString(
  dateRange: DateRange,
  stationIds: string[],
  clinicalIds: ClinicalDiseaseId[],
  hiddenKeys: Set<string>,
  department: string | null
): string {
  const params = new URLSearchParams();
  params.set("from", dateRange.from);
  params.set("to", dateRange.to);
  params.set("stations", stationIds.join(","));
  params.set("clinical", clinicalIds.join(","));
  if (hiddenKeys.size > 0) {
    params.set("hidden", Array.from(hiddenKeys).join(","));
  }
  if (department) {
    params.set("dep", department);
  }
  return params.toString();
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseUrlSyncOptions {
  dateRange: DateRange;
  stationIds: string[];
  clinicalIds: ClinicalDiseaseId[];
  hiddenKeys: Set<string>;
  department: string | null;
  setRange: (from: Date, to: Date) => void;
  setStations: (ids: string[]) => void;
  setDiseases: (ids: ClinicalDiseaseId[]) => void;
  setHiddenKeys: (keys: Set<string>) => void;
  setDepartment: (code: string | null) => void;
}

export function useUrlSync({
  dateRange,
  stationIds,
  clinicalIds,
  hiddenKeys,
  department,
  setRange,
  setStations,
  setDiseases,
  setHiddenKeys,
  setDepartment,
}: UseUrlSyncOptions) {
  const initialized = useRef(false);

  // Mount effect — runs once
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const params = new URLSearchParams(window.location.search);
    const hasAny =
      params.has("from") ||
      params.has("to") ||
      params.has("stations") ||
      params.has("clinical") ||
      params.has("hidden") ||
      params.has("dep");

    if (hasAny) {
      // Override localStorage with URL values (only for params that exist)
      const from = parseDateParam(params.get("from"));
      const to = parseDateParam(params.get("to"));
      if (from && to) {
        setRange(new Date(from), new Date(to));
      } else if (from) {
        setRange(new Date(from), new Date(dateRange.to));
      } else if (to) {
        setRange(new Date(dateRange.from), new Date(to));
      }

      const stations = parseStationsParam(params.get("stations"));
      if (stations) {
        setStations(stations);
      }

      const clinical = parseClinicalParam(params.get("clinical"));
      if (clinical !== null) {
        setDiseases(clinical);
      }

      const hidden = parseHiddenParam(params.get("hidden"));
      if (hidden !== null) {
        setHiddenKeys(new Set(hidden));
      }

      const dep = parseDepartmentParam(params.get("dep"));
      if (dep !== null) {
        setDepartment(dep);
      }
    } else {
      // No URL params — push current state to URL
      const qs = buildSearchString(dateRange, stationIds, clinicalIds, hiddenKeys, department);
      window.history.replaceState(null, "", `?${qs}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync effect — update URL on state changes (skip mount)
  const mountSkipped = useRef(false);
  useEffect(() => {
    if (!mountSkipped.current) {
      mountSkipped.current = true;
      return;
    }
    const qs = buildSearchString(dateRange, stationIds, clinicalIds, hiddenKeys, department);
    window.history.replaceState(null, "", `?${qs}`);
  }, [dateRange, stationIds, clinicalIds, hiddenKeys, department]);
}
