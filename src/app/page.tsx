import { SeveritySummary } from "@/components/severity/severity-summary";
import { StationSelect } from "@/components/filters/station-select";
import { DateRangePicker } from "@/components/filters/date-range-picker";
import { WastewaterChart } from "@/components/chart/wastewater-chart";

export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <SeveritySummary />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex-1">
          <StationSelect />
        </div>
        <DateRangePicker />
      </div>
      <WastewaterChart />
    </div>
  );
}
