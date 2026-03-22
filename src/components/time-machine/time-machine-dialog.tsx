"use client";

import { useEffect, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DATA_START_DATE } from "@/lib/constants";
import { SnapshotChart } from "./snapshot-chart";

function formatDateFr(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

interface TimeMachineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
}

export function TimeMachineDialog({
  open,
  onOpenChange,
  defaultDate,
}: TimeMachineDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(
    defaultDate ? new Date(defaultDate) : new Date()
  );
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    if (defaultDate) setSelectedDate(new Date(defaultDate));
  }, [defaultDate]);

  const asOfDate = toISODate(selectedDate);

  const { data, isPending } = trpc.timeMachine.getSnapshot.useQuery(
    { asOfDate },
    { enabled: open },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Machine temporelle</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-muted-foreground text-sm">
              Données disponibles au :
            </span>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[220px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formatDateFr(selectedDate)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                      setCalendarOpen(false);
                    }
                  }}
                  disabled={{ after: new Date(), before: DATA_START_DATE }}
                  defaultMonth={selectedDate}
                />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground text-xs italic">
              (estimation basée sur les délais de publication)
            </span>
          </div>

          {isPending ? (
            <Skeleton className="h-[250px] w-full sm:h-[300px]" />
          ) : data ? (
            <SnapshotChart
              wastewater={data.wastewater}
              clinical={data.clinical}
              asOfDate={asOfDate}
            />
          ) : null}

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: "hsl(210, 90%, 55%)" }} />
              Covid eaux usées
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                <line x1="0" y1="5" x2="10" y2="5" stroke="hsl(0, 75%, 55%)" strokeWidth="2" strokeDasharray="3 1.5" />
              </svg>
              Grippe
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                <line x1="0" y1="5" x2="10" y2="5" stroke="hsl(190, 80%, 45%)" strokeWidth="2" strokeDasharray="3 1.5" />
              </svg>
              Bronchiolite
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                <line x1="0" y1="5" x2="10" y2="5" stroke="hsl(45, 90%, 50%)" strokeWidth="2" strokeDasharray="3 1.5" />
              </svg>
              COVID-19 urgences
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
