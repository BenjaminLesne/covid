"use client";

import { useState, useCallback } from "react";
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

const TRPC_CHECK = {
  name: "tRPC — wastewater.getStations",
  url: "/api/trpc/wastewater.getStations",
};

function buildInitialChecks(): HealthCheck[] {
  return [
    ...SUMEAU_CHECKS,
    ...CLINICAL_CHECKS,
    { ...TRPC_CHECK },
  ].map((c) => ({ ...c, status: "idle" as const, responseTime: null, error: null }));
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
      updateCheck(url, { status: "loading", responseTime: null, error: null });
      const start = performance.now();

      try {
        if (isTrpc) {
          // tRPC internal endpoint — simple GET
          const res = await fetch(url, {
            signal: AbortSignal.timeout(10000),
          });
          const elapsed = Math.round(performance.now() - start);
          if (res.ok) {
            updateCheck(url, { status: "ok", responseTime: elapsed });
          } else {
            updateCheck(url, {
              status: "error",
              responseTime: elapsed,
              error: `HTTP ${res.status}`,
            });
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
              updateCheck(url, { status: "ok", responseTime: elapsed });
            } else {
              updateCheck(url, {
                status: "error",
                responseTime: elapsed,
                error: `HTTP ${res.status}`,
              });
            }
          } catch {
            // HEAD failed (likely CORS), try GET and abort after headers
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
              // We got headers — abort the body download
              controller.abort();
              if (res.ok) {
                updateCheck(url, { status: "ok", responseTime: elapsed });
              } else {
                updateCheck(url, {
                  status: "error",
                  responseTime: elapsed,
                  error: `HTTP ${res.status}`,
                });
              }
            } catch (e) {
              controller.abort();
              const elapsed = Math.round(performance.now() - start);
              if (e instanceof DOMException && e.name === "TimeoutError") {
                updateCheck(url, {
                  status: "error",
                  responseTime: elapsed,
                  error: "Timeout (10s)",
                });
              } else if (
                e instanceof DOMException &&
                e.name === "AbortError"
              ) {
                // Our own abort after receiving headers — that's a success
                updateCheck(url, { status: "ok", responseTime: elapsed });
              } else {
                updateCheck(url, {
                  status: "error",
                  responseTime: elapsed,
                  error:
                    e instanceof Error ? e.message : "Erreur réseau",
                });
              }
            }
          }
        }
      } catch (e) {
        const elapsed = Math.round(performance.now() - start);
        if (e instanceof DOMException && e.name === "TimeoutError") {
          updateCheck(url, {
            status: "error",
            responseTime: elapsed,
            error: "Timeout (10s)",
          });
        } else {
          updateCheck(url, {
            status: "error",
            responseTime: elapsed,
            error: e instanceof Error ? e.message : "Erreur réseau",
          });
        }
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
      { url: TRPC_CHECK.url, isTrpc: true },
    ];

    await Promise.allSettled(all.map((c) => runCheck(c.url, c.isTrpc)));

    setLastChecked(new Date());
    setRunning(false);
  }, [runCheck]);

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

function CheckRow({ check }: { check: HealthCheck }) {
  return (
    <div className="bg-card flex items-center gap-3 rounded-lg border p-3">
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
        {check.error && (
          <span className="text-red-600 text-xs">{check.error}</span>
        )}
      </div>
    </div>
  );
}
