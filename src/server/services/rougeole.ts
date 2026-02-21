/**
 * Rougeole (measles) mandatory notification data fetching service.
 *
 * Fetches yearly notification rate data from the Santé publique France
 * Odissé API v2.1 — rougeole déclarations obligatoires dataset.
 *
 * Pre-filtered server-side for "Tous âges" age group.
 */

import type { RougeoleIndicator } from "@/types/rougeole";

const ROUGEOLE_API_URL =
  "https://odisse.santepubliquefrance.fr/api/explore/v2.1/catalog/datasets/rougeole-donnees-declaration-obligatoire/exports/json?where=mdo_cl_age_rougeole%3D%22Tous%20%C3%A2ges%22";

/**
 * Fetch rougeole indicators from the Odissé API.
 *
 * Returns typed array with fields mapped from the raw API response.
 * Filters for "Tous âges" server-side via the URL query parameter.
 */
export async function fetchRougeoleIndicators(): Promise<RougeoleIndicator[]> {
  const res = await fetch(ROUGEOLE_API_URL, {
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(
      `Odissé rougeole API error: ${res.status} ${res.statusText}`,
    );
  }

  const raw: Record<string, unknown>[] = await res.json();

  const indicators: RougeoleIndicator[] = [];

  for (const record of raw) {
    const annee = record["annee"];
    if (typeof annee !== "string" && typeof annee !== "number") continue;

    const dep = record["dep"];
    if (typeof dep !== "string") continue;

    const libgeo = record["libgeo"];
    const txRaw = record["tx"];
    const rouRaw = record["rou"];
    const popRaw = record["population"];

    indicators.push({
      annee: String(annee),
      dep,
      libgeo: typeof libgeo === "string" ? libgeo : "",
      tx:
        typeof txRaw === "number" && Number.isFinite(txRaw) ? txRaw : null,
      rou:
        typeof rouRaw === "number" && Number.isFinite(rouRaw) ? rouRaw : null,
      population:
        typeof popRaw === "number" && Number.isFinite(popRaw) ? popRaw : null,
    });
  }

  return indicators;
}
