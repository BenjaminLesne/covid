"use client";

import { CLINICAL_DISEASE_IDS, CLINICAL_DATASETS } from "@/lib/constants";
import { useClinicalPreferences } from "@/hooks/use-clinical-preferences";

/**
 * Pill-style toggle buttons for enabling/disabling clinical data overlays.
 * Enabled pills show the disease color as background; disabled pills are muted.
 */
export function ClinicalToggle() {
  const { toggleDisease, isEnabled } = useClinicalPreferences();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-sm font-medium">
        Données cliniques :
      </span>
      {CLINICAL_DISEASE_IDS.map((id) => {
        const dataset = CLINICAL_DATASETS[id];
        const enabled = isEnabled(id);

        return (
          <button
            key={id}
            type="button"
            onClick={() => toggleDisease(id)}
            className="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
            style={
              enabled
                ? {
                    backgroundColor: dataset.color,
                    borderColor: dataset.color,
                    color: "#fff",
                  }
                : undefined
            }
            aria-pressed={enabled}
          >
            {dataset.label}
          </button>
        );
      })}
    </div>
  );
}
