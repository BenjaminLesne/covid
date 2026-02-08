"use client";

import { useCallback } from "react";
import { useLocalStorage } from "./use-local-storage";
import { CLINICAL_DISEASE_IDS } from "@/lib/constants";
import type { ClinicalDiseaseId } from "@/types/clinical";

const STORAGE_KEY = "eauxvid:clinical-overlays";

/**
 * Hook for managing enabled clinical data overlays.
 * Persists to localStorage. All 3 diseases enabled by default.
 */
export function useClinicalPreferences() {
  const [enabledDiseases, setEnabledDiseases] = useLocalStorage<
    ClinicalDiseaseId[]
  >(STORAGE_KEY, [...CLINICAL_DISEASE_IDS]);

  const toggleDisease = useCallback(
    (id: ClinicalDiseaseId) => {
      setEnabledDiseases((prev) => {
        if (prev.includes(id)) {
          return prev.filter((d) => d !== id);
        }
        return [...prev, id];
      });
    },
    [setEnabledDiseases]
  );

  const isEnabled = useCallback(
    (id: ClinicalDiseaseId) => enabledDiseases.includes(id),
    [enabledDiseases]
  );

  return {
    enabledDiseases,
    toggleDisease,
    isEnabled,
  };
}
