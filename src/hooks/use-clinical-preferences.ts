"use client";

import { useCallback } from "react";
import { useQueryState, createParser } from "nuqs";
import { CLINICAL_DISEASE_IDS } from "@/lib/constants";
import type { ClinicalDiseaseId } from "@/types/clinical";

const clinicalParser = createParser({
  parse: (v: string): ClinicalDiseaseId[] => {
    if (v === "none") return [];
    return v
      .split(",")
      .map((s) => s.trim())
      .filter((id) =>
        (CLINICAL_DISEASE_IDS as readonly string[]).includes(id)
      ) as ClinicalDiseaseId[];
  },
  serialize: (v: ClinicalDiseaseId[]) =>
    v.length === 0 ? "none" : v.join(","),
  eq: (a: ClinicalDiseaseId[], b: ClinicalDiseaseId[]) =>
    a.length === b.length && a.every((v, i) => v === b[i]),
}).withDefault([...CLINICAL_DISEASE_IDS]).withOptions({ history: "replace" });

export function useClinicalPreferences() {
  const [enabledDiseases, setEnabledDiseases] = useQueryState(
    "clinical",
    clinicalParser
  );

  const toggleDisease = useCallback(
    (id: ClinicalDiseaseId) => {
      void setEnabledDiseases((prev) =>
        prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
      );
    },
    [setEnabledDiseases]
  );

  const setDiseases = useCallback(
    (ids: ClinicalDiseaseId[]) => {
      const valid = ids.filter((id) =>
        (CLINICAL_DISEASE_IDS as readonly string[]).includes(id)
      );
      void setEnabledDiseases(valid);
    },
    [setEnabledDiseases]
  );

  const isEnabled = useCallback(
    (id: ClinicalDiseaseId) => enabledDiseases.includes(id),
    [enabledDiseases]
  );

  return { enabledDiseases, toggleDisease, setDiseases, isEnabled };
}
