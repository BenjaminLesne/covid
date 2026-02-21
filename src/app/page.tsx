"use client";

import { useState, useCallback } from "react";
import { StationSelect } from "@/components/filters/station-select";
import { DateRangePicker } from "@/components/filters/date-range-picker";
import { WastewaterChart } from "@/components/chart/wastewater-chart";
import { FranceMap } from "@/components/map/france-map";
import { ClinicalToggle } from "@/components/filters/clinical-toggle";
import { DepartmentSelect } from "@/components/filters/department-select";
import { useStationPreferences } from "@/hooks/use-station-preferences";
import { useDateRange } from "@/hooks/use-date-range";
import { useClinicalPreferences } from "@/hooks/use-clinical-preferences";
import { useDepartmentPreferences } from "@/hooks/use-department-preferences";
import { useUrlSync } from "@/hooks/use-url-sync";
import { RougeoleChart } from "@/components/rougeole-chart";

export default function Home() {
  const { selectedIds, toggleStation, canAddMore, setStations } =
    useStationPreferences();
  const { dateRange, setRange, setPreset, preset } = useDateRange();
  const { enabledDiseases, setDiseases } = useClinicalPreferences();
  const { department, setDepartment, departmentLabel } = useDepartmentPreferences();

  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());
  const toggleLine = useCallback((key: string) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  useUrlSync({
    dateRange,
    preset,
    stationIds: selectedIds,
    clinicalIds: enabledDiseases,
    hiddenKeys,
    department,
    setRange,
    setPreset,
    setStations,
    setDiseases,
    setHiddenKeys,
    setDepartment,
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Presentation */}
      <section className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">
          Tableau de bord de surveillance sanitaire
        </h1>
        <p className="text-muted-foreground text-sm">
          Suivi de la concentration virale dans les eaux usées (réseau{" "}
          <a
            href="https://www.sum-eau.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            SUM&apos;Eau
          </a>
          ) croisé avec les données cliniques de passages aux urgences —
          Covid-19, bronchiolite, grippe et rougeole. Sélectionnez des
          stations, un département et une période pour explorer les tendances.
        </p>
      </section>

      {/* Filters: station select + department select + date range */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex-1">
          <StationSelect />
        </div>
        <div className="flex-1">
          <DepartmentSelect />
        </div>
        <DateRangePicker />
      </div>

      {/* Clinical data overlay toggles */}
      <ClinicalToggle />

      {/* Chart + Map: side-by-side on desktop, stacked on mobile/tablet */}
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-6">
        <div className="min-w-0 lg:w-3/5">
          <h2 className="text-muted-foreground mb-2 text-sm font-medium">
            Concentration virale (eaux usées) · Passages aux urgences (clinique)
          </h2>
          <WastewaterChart
            hiddenKeys={hiddenKeys}
            onToggle={toggleLine}
            department={department}
            departmentLabel={departmentLabel}
          />
        </div>
        <div className="min-w-0 lg:w-2/5">
          <h2 className="text-muted-foreground mb-2 text-sm font-medium">
            Stations SUM&apos;Eau — sévérité Covid eaux usées
          </h2>
          <FranceMap
            selectedIds={selectedIds}
            canAddMore={canAddMore}
            onToggle={toggleStation}
          />
        </div>
      </div>

      {/* Rougeole section */}
      <RougeoleChart department={department} />
    </div>
  );
}
