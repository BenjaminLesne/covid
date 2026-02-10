"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { DATA_URLS, ODISSE_API_BASE, CLINICAL_DATASETS, CLINICAL_DISEASE_IDS } from "@/lib/constants";
import type { ClinicalDiseaseId } from "@/types/clinical";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CheckStatus = "idle" | "loading" | "ok" | "error";

interface HealthCheck {
  name: string;
  url: string;
  status: CheckStatus;
  responseTime: number | null;
  error: string | null;
  httpStatus: number | null;
  httpStatusText: string | null;
  errorDetail: string | null;
  errorType: "timeout" | "cors" | "network" | "http" | "unknown" | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusColor(status: CheckStatus) {
  switch (status) {
    case "ok":
      return "bg-green-500";
    case "error":
      return "bg-red-500";
    case "loading":
      return "bg-amber-400 animate-pulse";
    default:
      return "bg-gray-300";
  }
}

function truncateUrl(url: string, max = 60) {
  return url.length > max ? url.slice(0, max) + "…" : url;
}

/** Try to read the first ~500 chars of a response body for error detail. */
async function readErrorBody(res: Response): Promise<string | null> {
  try {
    const text = await res.text();
    if (!text) return null;
    // Try to extract a meaningful message from JSON responses
    try {
      const json = JSON.parse(text);
      // tRPC error shape
      if (json?.[0]?.error?.message) return json[0].error.message;
      if (json?.error?.message) return json.error.message;
      // Generic API error shapes
      if (json?.message) return json.message;
      if (json?.detail) return String(json.detail);
      if (json?.error && typeof json.error === "string") return json.error;
    } catch {
      // Not JSON — return raw text truncated
    }
    return text.length > 500 ? text.slice(0, 500) + "…" : text;
  } catch {
    return null;
  }
}

/** Classify a fetch error into a more specific type. */
function classifyError(e: unknown): {
  errorType: HealthCheck["errorType"];
  error: string;
} {
  if (e instanceof DOMException && e.name === "TimeoutError") {
    return { errorType: "timeout", error: "Délai d'attente dépassé (10s)" };
  }
  if (e instanceof DOMException && e.name === "AbortError") {
    return { errorType: "network", error: "Requête annulée" };
  }
  if (e instanceof TypeError && e.message === "Failed to fetch") {
    return {
      errorType: "cors",
      error: "Bloqué (CORS) ou serveur injoignable",
    };
  }
  if (e instanceof TypeError) {
    return { errorType: "network", error: e.message };
  }
  if (e instanceof Error) {
    return { errorType: "unknown", error: e.message };
  }
  return { errorType: "unknown", error: "Erreur inconnue" };
}

// ---------------------------------------------------------------------------
// Initial state builders
// ---------------------------------------------------------------------------

const SUMEAU_CHECKS: { name: string; url: string }[] = [
  { name: "data.gouv.fr — Indicateurs CSV", url: DATA_URLS.indicators.primary },
  { name: "Odissé — Indicateurs JSON", url: DATA_URLS.indicators.fallback },
  { name: "data.gouv.fr — Stations CSV", url: DATA_URLS.stations.primary },
  { name: "Odissé — Stations JSON", url: DATA_URLS.stations.fallback },
];

const CLINICAL_CHECKS: { name: string; url: string }[] = CLINICAL_DISEASE_IDS.map(
  (id: ClinicalDiseaseId) => {
    const meta = CLINICAL_DATASETS[id];
    return {
      name: meta.label,
      url: `${ODISSE_API_BASE}/${meta.datasetId}/records?limit=1`,
    };
  }
);

const TRPC_CHECKS: { name: string; url: string }[] = [
  { name: "tRPC — wastewater.getStations", url: "/api/trpc/wastewater.getStations" },
  { name: "tRPC — wastewater.getIndicators", url: "/api/trpc/wastewater.getIndicators" },
  { name: "tRPC — wastewater.getNationalTrend", url: "/api/trpc/wastewater.getNationalTrend" },
  { name: "tRPC — clinical.getIndicators", url: "/api/trpc/clinical.getIndicators" },
];

function buildInitialChecks(): HealthCheck[] {
  return [
    ...SUMEAU_CHECKS,
    ...CLINICAL_CHECKS,
    ...TRPC_CHECKS,
  ].map((c) => ({
    ...c,
    status: "idle" as const,
    responseTime: null,
    error: null,
    httpStatus: null,
    httpStatusText: null,
    errorDetail: null,
    errorType: null,
  }));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HealthPage() {
  const [checks, setChecks] = useState<HealthCheck[]>(buildInitialChecks);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [running, setRunning] = useState(false);

  const updateCheck = useCallback(
    (url: string, patch: Partial<HealthCheck>) => {
      setChecks((prev) =>
        prev.map((c) => (c.url === url ? { ...c, ...patch } : c))
      );
    },
    []
  );

  const runCheck = useCallback(
    async (url: string, isTrpc: boolean) => {
      updateCheck(url, {
        status: "loading",
        responseTime: null,
        error: null,
        httpStatus: null,
        httpStatusText: null,
        errorDetail: null,
        errorType: null,
      });
      const start = performance.now();

      const markOk = (elapsed: number, httpStatus: number, httpStatusText: string) =>
        updateCheck(url, {
          status: "ok",
          responseTime: elapsed,
          httpStatus,
          httpStatusText,
        });

      const markHttpError = async (elapsed: number, res: Response) => {
        const detail = await readErrorBody(res);
        updateCheck(url, {
          status: "error",
          responseTime: elapsed,
          error: `HTTP ${res.status} ${res.statusText}`,
          httpStatus: res.status,
          httpStatusText: res.statusText,
          errorDetail: detail,
          errorType: "http",
        });
      };

      const markFetchError = (elapsed: number, e: unknown) => {
        const { errorType, error } = classifyError(e);
        updateCheck(url, {
          status: "error",
          responseTime: elapsed,
          error,
          errorType,
        });
      };

      try {
        if (isTrpc) {
          const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
          const elapsed = Math.round(performance.now() - start);
          if (res.ok) {
            markOk(elapsed, res.status, res.statusText);
          } else {
            await markHttpError(elapsed, res);
          }
        } else {
          // External API — try HEAD first, fallback to GET
          try {
            const res = await fetch(url, {
              method: "HEAD",
              mode: "cors",
              signal: AbortSignal.timeout(10000),
            });
            const elapsed = Math.round(performance.now() - start);
            if (res.ok) {
              markOk(elapsed, res.status, res.statusText);
            } else {
              await markHttpError(elapsed, res);
            }
          } catch {
            // HEAD failed (likely CORS) — retry with GET, abort after headers
            const controller = new AbortController();
            try {
              const res = await fetch(url, {
                mode: "cors",
                signal: AbortSignal.any([
                  controller.signal,
                  AbortSignal.timeout(10000),
                ]),
              });
              const elapsed = Math.round(performance.now() - start);
              controller.abort();
              if (res.ok) {
                markOk(elapsed, res.status, res.statusText);
              } else {
                await markHttpError(elapsed, res);
              }
            } catch (e) {
              controller.abort();
              const elapsed = Math.round(performance.now() - start);
              // Our own abort after receiving headers = success
              if (
                e instanceof DOMException &&
                e.name === "AbortError"
              ) {
                updateCheck(url, { status: "ok", responseTime: elapsed });
              } else {
                markFetchError(elapsed, e);
              }
            }
          }
        }
      } catch (e) {
        const elapsed = Math.round(performance.now() - start);
        markFetchError(elapsed, e);
      }
    },
    [updateCheck]
  );

  const runAllChecks = useCallback(async () => {
    setRunning(true);
    // Reset all checks
    setChecks(buildInitialChecks());

    const all = [
      ...SUMEAU_CHECKS.map((c) => ({ url: c.url, isTrpc: false })),
      ...CLINICAL_CHECKS.map((c) => ({ url: c.url, isTrpc: false })),
      ...TRPC_CHECKS.map((c) => ({ url: c.url, isTrpc: true })),
    ];

    await Promise.allSettled(all.map((c) => runCheck(c.url, c.isTrpc)));

    setLastChecked(new Date());
    setRunning(false);
  }, [runCheck]);

  // Run checks automatically on mount
  const hasRun = useRef(false);
  useEffect(() => {
    if (!hasRun.current) {
      hasRun.current = true;
      void Promise.resolve().then(() => runAllChecks());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived state
  const completedChecks = checks.filter(
    (c) => c.status === "ok" || c.status === "error"
  );
  const okCount = checks.filter((c) => c.status === "ok").length;
  const errorCount = checks.filter((c) => c.status === "error").length;
  const isLoading = checks.some((c) => c.status === "loading");
  const allDone = completedChecks.length === checks.length && !isLoading;

  let bannerText: string;
  let bannerClass: string;

  if (isLoading || (running && !allDone)) {
    bannerText = "Vérification en cours…";
    bannerClass = "bg-amber-100 text-amber-900 border-amber-300";
  } else if (allDone && errorCount === 0) {
    bannerText = "Tous les services sont opérationnels";
    bannerClass = "bg-green-100 text-green-900 border-green-300";
  } else if (allDone && okCount === 0) {
    bannerText = "Services indisponibles";
    bannerClass = "bg-red-100 text-red-900 border-red-300";
  } else if (allDone) {
    bannerText = "Certains services sont dégradés";
    bannerClass = "bg-amber-100 text-amber-900 border-amber-300";
  } else {
    bannerText = "";
    bannerClass = "bg-gray-100 text-gray-600 border-gray-200";
  }

  const sumeauChecks = checks.slice(0, SUMEAU_CHECKS.length);
  const clinicalChecks = checks.slice(
    SUMEAU_CHECKS.length,
    SUMEAU_CHECKS.length + CLINICAL_CHECKS.length
  );
  const trpcChecks = checks.slice(
    SUMEAU_CHECKS.length + CLINICAL_CHECKS.length
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          EauxVid — Health Check
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Surveillance de la disponibilité des sources de données externes et de
          l&apos;API interne.
        </p>
      </div>

      {/* Summary banner */}
      {(allDone || isLoading) && (
        <div className={`rounded-lg border p-4 ${bannerClass}`}>
          <p className="font-semibold">{bannerText}</p>
          {allDone && (
            <p className="mt-1 text-sm">
              {okCount}/{checks.length} services opérationnels
            </p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
          Opérationnel
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
          Vérification en cours
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
          Erreur
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-300" />
          Non vérifié
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={runAllChecks}
          disabled={running}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50"
        >
          {running ? "Vérification…" : "Rafraîchir"}
        </button>
        {lastChecked && (
          <span className="text-muted-foreground text-sm">
            Dernière vérification :{" "}
            {lastChecked.toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        )}
      </div>

      {/* SUM'Eau section */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Sources SUM&apos;Eau (données eaux usées)
        </h2>
        <div className="flex flex-col gap-2">
          {sumeauChecks.map((check) => (
            <CheckRow key={check.url} check={check} />
          ))}
        </div>
      </section>

      {/* Clinical section */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Odissé — Données cliniques (passages urgences)
        </h2>
        <div className="flex flex-col gap-2">
          {clinicalChecks.map((check) => (
            <CheckRow key={check.url} check={check} />
          ))}
        </div>
      </section>

      {/* tRPC section */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">API interne (tRPC)</h2>
        <div className="flex flex-col gap-2">
          {trpcChecks.map((check) => (
            <CheckRow key={check.url} check={check} />
          ))}
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CheckRow sub-component
// ---------------------------------------------------------------------------

function errorTypeLabel(type: HealthCheck["errorType"]): string | null {
  switch (type) {
    case "timeout":
      return "Timeout";
    case "cors":
      return "CORS / Réseau";
    case "network":
      return "Réseau";
    case "http":
      return "Erreur HTTP";
    case "unknown":
      return "Erreur";
    default:
      return null;
  }
}

function CheckRow({ check }: { check: HealthCheck }) {
  const hasError = check.status === "error";

  return (
    <div
      className={`bg-card rounded-lg border p-3 ${hasError ? "border-red-200 dark:border-red-900/40" : ""}`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`inline-block h-3 w-3 shrink-0 rounded-full ${statusColor(check.status)}`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{check.name}</p>
          <p className="text-muted-foreground truncate text-xs">
            {truncateUrl(check.url)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-sm">
          {check.responseTime !== null && (
            <span className="text-muted-foreground tabular-nums">
              {check.responseTime} ms
            </span>
          )}
          {check.status === "ok" && check.httpStatus && (
            <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
              {check.httpStatus}
            </span>
          )}
          {hasError && check.errorType && (
            <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {errorTypeLabel(check.errorType)}
            </span>
          )}
        </div>
      </div>

      {/* Expanded error details */}
      {hasError && (
        <div className="mt-2 ml-6 space-y-1">
          {check.error && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {check.error}
            </p>
          )}
          {check.errorDetail && (
            <pre className="max-h-24 overflow-auto rounded bg-red-50 p-2 text-xs whitespace-pre-wrap text-red-800 dark:bg-red-950/30 dark:text-red-300">
              {check.errorDetail}
            </pre>
          )}
          {check.errorType === "cors" && (
            <p className="text-muted-foreground text-xs italic">
              Le navigateur bloque cette requête (politique CORS). L&apos;API
              peut être fonctionnelle côté serveur.
            </p>
          )}
          {check.errorType === "timeout" && (
            <p className="text-muted-foreground text-xs italic">
              Le serveur n&apos;a pas répondu dans le délai imparti de 10
              secondes.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
