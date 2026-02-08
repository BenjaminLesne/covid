"use client";

import { cn } from "@/lib/utils";

export interface LegendEntry {
  key: string;
  label: string;
  color: string;
  dashed?: boolean;
}

interface ChartLegendProps {
  entries: LegendEntry[];
  hiddenKeys: Set<string>;
  onToggle: (key: string) => void;
}

export function ChartLegend({ entries, hiddenKeys, onToggle }: ChartLegendProps) {
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 lg:flex-col lg:gap-y-1.5">
      {entries.map((entry) => {
        const hidden = hiddenKeys.has(entry.key);
        return (
          <button
            key={entry.key}
            type="button"
            onClick={() => onToggle(entry.key)}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted",
              hidden && "opacity-40"
            )}
          >
            {entry.dashed ? (
              <svg
                className="shrink-0"
                width="20"
                height="4"
                viewBox="0 0 20 4"
                aria-hidden="true"
              >
                <line
                  x1="0"
                  y1="2"
                  x2="20"
                  y2="2"
                  stroke={entry.color}
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />
              </svg>
            ) : (
              <span
                className="inline-block h-0.5 w-5 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
            )}
            <span className="text-left">{entry.label}</span>
          </button>
        );
      })}
    </div>
  );
}
