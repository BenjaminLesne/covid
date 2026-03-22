"use client";

import { useState } from "react";
import { CalendarIcon, X, Info } from "lucide-react";
import { useAsOfDate } from "@/hooks/use-as-of-date";
import { DATA_START_DATE } from "@/lib/constants";
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

export function AsOfDatePicker() {
  const { asOfDate, setAsOfDate, resetAsOfDate } = useAsOfDate();
  const [open, setOpen] = useState(false);
  const today = new Date();
  const currentDate = asOfDate ? new Date(asOfDate) : today;
  const isActive = asOfDate !== null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground text-xs font-medium">
          Données au :
        </span>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 text-sm" align="start" side="top">
            <p>
              Permet de remonter dans le temps et voir les données telles
              qu&apos;elles étaient disponibles à une date passée, avant les
              mises à jour ultérieures.
            </p>
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex items-center gap-1">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={isActive ? "secondary" : "outline"}
              size="sm"
              className={cn("justify-start text-left font-normal text-xs")}
            >
              <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
              {isActive ? formatDate(currentDate) : "Aujourd'hui"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={currentDate}
              onSelect={(date) => {
                if (date) {
                  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
                  if (iso === todayIso) {
                    void setAsOfDate(null);
                  } else {
                    void setAsOfDate(iso);
                  }
                  setOpen(false);
                }
              }}
              defaultMonth={currentDate}
              disabled={[
                { before: DATA_START_DATE },
                { after: today },
              ]}
              captionLayout="dropdown"
              startMonth={DATA_START_DATE}
              endMonth={today}
            />
          </PopoverContent>
        </Popover>
        {isActive && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="Revenir aux dernières données"
            onClick={resetAsOfDate}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
