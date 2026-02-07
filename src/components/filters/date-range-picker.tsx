"use client";

import { useState } from "react";
import { CalendarIcon, RotateCcw } from "lucide-react";
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

function formatDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function DateRangePicker() {
  const { fromDate, toDate, setRange, reset } = useDateRange();
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

  return (
    <div className="flex items-center gap-2">
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
      <Button
        variant="ghost"
        size="icon"
        onClick={reset}
        title="Réinitialiser (6 derniers mois)"
        aria-label="Réinitialiser la période"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
}
