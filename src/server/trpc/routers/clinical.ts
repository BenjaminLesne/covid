import { z } from "zod";
import { router, publicProcedure } from "../init";
import {
  fetchClinicalIndicators,
  fetchClinicalIndicatorsByDisease,
} from "@/server/services/clinical";
import type { ClinicalDiseaseId } from "@/types/clinical";
import { CLINICAL_DISEASE_IDS } from "@/lib/constants";

/** Zod enum for clinical disease IDs. */
const clinicalDiseaseIdEnum = z.enum(
  CLINICAL_DISEASE_IDS as unknown as [string, ...string[]]
);

export const clinicalRouter = router({
  /**
   * Get clinical indicators, optionally filtered by disease IDs and date range.
   */
  getIndicators: publicProcedure
    .input(
      z
        .object({
          diseaseIds: z.array(clinicalDiseaseIdEnum).optional(),
          dateRange: z
            .object({
              from: z.string(),
              to: z.string(),
            })
            .optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      let indicators = input?.diseaseIds && input.diseaseIds.length > 0
        ? await fetchClinicalIndicatorsByDisease(
            input.diseaseIds as ClinicalDiseaseId[]
          )
        : await fetchClinicalIndicators();

      // Filter by date range if provided (lexicographic ISO week comparison)
      if (input?.dateRange) {
        const { from, to } = input.dateRange;
        indicators = indicators.filter(
          (ind) => ind.week >= from && ind.week <= to
        );
      }

      return indicators;
    }),
});
