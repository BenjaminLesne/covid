import type { SeverityLevel } from "@/types/wastewater";
import { SEVERITY_LEVELS } from "@/lib/constants";
import { getSeverityColor } from "@/lib/severity";

interface SeverityBadgeProps {
  level: SeverityLevel;
  size?: "sm" | "lg";
}

export function SeverityBadge({ level, size = "sm" }: SeverityBadgeProps) {
  const { label } = SEVERITY_LEVELS[level];
  const color = getSeverityColor(level);

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-block rounded-full ${size === "lg" ? "h-5 w-5" : "h-3 w-3"}`}
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span
        className={`font-semibold ${size === "lg" ? "text-lg" : "text-sm"}`}
        style={{ color }}
      >
        {label}
      </span>
    </div>
  );
}
