"use client";

import { useState, useCallback } from "react";
import { SeveritySummary } from "@/components/severity/severity-summary";
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

export default function Home() {
  const { selectedIds, toggleStation, canAddMore, setStations } =
    useStationPreferences();
  const { dateRange, setRange } = useDateRange();
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
    stationIds: selectedIds,
    clinicalIds: enabledDiseases,
    hiddenKeys,
    department,
    setRange,
    setStations,
    setDiseases,
    setHiddenKeys,
    setDepartment,
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Severity summary + disclaimer */}
      <div className="flex flex-col gap-3">
        <SeveritySummary />
        <p className="text-muted-foreground text-xs leading-relaxed">
          Les niveaux de circulation virale sont issus de l&apos;analyse des
          eaux usées et ne reflètent pas directement le nombre de cas
          cliniques. Ces indicateurs complètent les données épidémiologiques
          mais ne s&apos;y substituent pas.
        </p>
      </div>

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
    </div>
  );
}
