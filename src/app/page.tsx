import { SeveritySummary } from "@/components/severity/severity-summary";
import { StationSelect } from "@/components/filters/station-select";

export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <SeveritySummary />
      <StationSelect />
    </div>
  );
}
