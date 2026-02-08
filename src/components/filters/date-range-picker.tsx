"use client";

import { useCallback, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { type DateRange as RDPDateRange } from "react-day-picker";
import { useDateRange } from "@/hooks/use-date-range";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const PRESETS = [
  { label: "1 mois", months: 1 },
  { label: "6 mois", months: 6 },
  { label: "1 an", months: 12 },
] as const;

function formatDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function DateRangePicker() {
  const { fromDate, toDate, setRange } = useDateRange();
  const [open, setOpen] = useState(false);

  const selected: RDPDateRange = {
    from: fromDate,
    to: toDate,
  };

  const handleSelect = (range: RDPDateRange | undefined) => {
    if (range?.from && range?.to) {
      setRange(range.from, range.to);
    } else if (range?.from) {
      // User has selected start date, waiting for end date — just update from
      setRange(range.from, toDate);
    }
  };

  const applyPreset = useCallback(
    (months: number) => {
      const to = new Date();
      const from = new Date();
      from.setMonth(from.getMonth() - months);
      setRange(from, to);
    },
    [setRange]
  );

  return (
    <div className="flex items-center gap-2">
      {PRESETS.map((preset) => (
        <Button
          key={preset.months}
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => applyPreset(preset.months)}
        >
          {preset.label}
        </Button>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal sm:w-auto"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span className="truncate">
              {formatDate(fromDate)} — {formatDate(toDate)}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={selected}
            onSelect={handleSelect}
            numberOfMonths={2}
            defaultMonth={fromDate}
            disabled={{ after: new Date() }}
            captionLayout="dropdown"
            startMonth={new Date(2021, 0)}
            endMonth={new Date()}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
