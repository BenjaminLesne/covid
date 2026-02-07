"use client";

import { SeveritySummary } from "@/components/severity/severity-summary";
import { StationSelect } from "@/components/filters/station-select";
import { DateRangePicker } from "@/components/filters/date-range-picker";
import { WastewaterChart } from "@/components/chart/wastewater-chart";
import { FranceMap } from "@/components/map/france-map";
import { useStationPreferences } from "@/hooks/use-station-preferences";

export default function Home() {
  const { selectedIds, toggleStation, canAddMore } = useStationPreferences();

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

      {/* Filters: station select + date range */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex-1">
          <StationSelect />
        </div>
        <DateRangePicker />
      </div>

      {/* Chart + Map: side-by-side on desktop, stacked on mobile/tablet */}
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-6">
        <div className="min-w-0 lg:w-3/5">
          <WastewaterChart />
        </div>
        <div className="min-w-0 lg:w-2/5">
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
