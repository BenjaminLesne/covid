"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { useDateRange } from "@/hooks/use-date-range";
import { DATA_START_DATE } from "@/lib/constants";
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
  { label: "3 mois", months: 3 },
  { label: "6 mois", months: 6 },
  { label: "1 an", months: 12 },
] as const;

const ALL_PRESET = 0;

function formatDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function DatePicker({
  label,
  value,
  onChange,
  minDate,
  maxDate,
}: {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("justify-start text-left font-normal text-xs")}
          >
            <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
            {formatDate(value)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => {
              if (date) {
                onChange(date);
                setOpen(false);
              }
            }}
            defaultMonth={value}
            disabled={[
              ...(minDate ? [{ before: minDate }] : []),
              ...(maxDate ? [{ after: maxDate }] : []),
            ]}
            captionLayout="dropdown"
            startMonth={DATA_START_DATE}
            endMonth={new Date()}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function DateRangePicker() {
  const { fromDate, toDate, setRange, setPreset, preset } = useDateRange();
  const today = new Date();

  const handleFromChange = (date: Date) => {
    if (date > toDate) {
      setRange(date, date);
    } else {
      setRange(date, toDate);
    }
  };

  const handleToChange = (date: Date) => {
    if (date < fromDate) {
      setRange(date, date);
    } else {
      setRange(fromDate, date);
    }
  };

  const handlePreset = (months: number) => {
    if (months === ALL_PRESET) {
      setRange(DATA_START_DATE, today);
    } else {
      setPreset(months);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
        <Button
          key={p.months}
          variant={preset === p.months ? "default" : "outline"}
          size="sm"
          className="text-xs"
          onClick={() => handlePreset(p.months)}
        >
          {p.label}
        </Button>
      ))}
      <Button
        variant={
          !preset && fromDate.getTime() <= DATA_START_DATE.getTime()
            ? "default"
            : "outline"
        }
        size="sm"
        className="text-xs"
        onClick={() => handlePreset(ALL_PRESET)}
      >
        Tout
      </Button>
      <DatePicker
        label="Du"
        value={fromDate}
        onChange={handleFromChange}
        minDate={DATA_START_DATE}
        maxDate={toDate}
      />
      <DatePicker
        label="Au"
        value={toDate}
        onChange={handleToChange}
        minDate={fromDate}
        maxDate={today}
      />
    </div>
  );
}
