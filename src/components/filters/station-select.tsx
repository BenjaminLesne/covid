"use client";

import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, X, MapPin } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useStationPreferences } from "@/hooks/use-station-preferences";
import { NATIONAL_STATION_ID, MAX_SELECTED_STATIONS } from "@/lib/constants";
import { cn, accentInsensitiveFilter } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Station } from "@/types/wastewater";

export function StationSelect() {
  const [open, setOpen] = useState(false);
  const { data: stations, isLoading } =
    trpc.wastewater.getStations.useQuery();
  const {
    selectedIds,
    toggleStation,
    removeStation,
    isSelected,
    canAddMore,
  } = useStationPreferences();

  // Build a lookup map for station metadata
  const stationMap = useMemo(() => {
    const map = new Map<string, Station>();
    if (stations) {
      for (const s of stations) {
        map.set(s.sandreId, s);
      }
    }
    return map;
  }, [stations]);

  // Station names for selected chips (excluding national)
  const selectedStations = selectedIds.filter(
    (id) => id !== NATIONAL_STATION_ID
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium text-muted-foreground">
        Stations eaux usées
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="truncate text-left">
              {selectedStations.length === 0
                ? "Ajouter une station…"
                : `${selectedStations.length} station${selectedStations.length > 1 ? "s" : ""} sélectionnée${selectedStations.length > 1 ? "s" : ""}`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command filter={accentInsensitiveFilter}>
            <CommandInput placeholder="Rechercher par nom ou commune…" />
            <CommandList>
              <CommandEmpty>Aucune station trouvée.</CommandEmpty>
              <CommandGroup heading="Moyenne nationale">
                <CommandItem
                  disabled
                  className="opacity-70"
                >
                  <Check className="mr-2 h-4 w-4" />
                  <MapPin className="mr-1 h-3 w-3" />
                  Moyenne nationale
                  <span className="text-muted-foreground ml-auto text-xs">
                    toujours actif
                  </span>
                </CommandItem>
              </CommandGroup>
              <CommandGroup heading="Stations">
                {stations?.map((station) => {
                  const selected = isSelected(station.sandreId);
                  const disabled = !selected && !canAddMore;
                  return (
                    <CommandItem
                      key={station.sandreId}
                      value={`${station.name} ${station.commune}`}
                      onSelect={() => toggleStation(station.sandreId)}
                      disabled={disabled}
                      className={cn(disabled && "opacity-50")}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="truncate">{station.name}</span>
                      <span className="text-muted-foreground ml-auto text-xs truncate">
                        {station.commune}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected station chips */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="cursor-default">
          <MapPin className="mr-1 h-3 w-3" />
          Moyenne nationale
        </Badge>
        {selectedStations.map((id) => {
          const station = stationMap.get(id);
          return (
            <Badge
              key={id}
              variant="outline"
              className="gap-1"
            >
              {station?.name ?? id}
              <button
                type="button"
                className="ml-1 rounded-full outline-none hover:opacity-70 focus-visible:ring-2"
                onClick={() => removeStation(id)}
                aria-label={`Retirer ${station?.name ?? id}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          );
        })}
      </div>

      {!canAddMore && (
        <p className="text-muted-foreground text-xs">
          Maximum {MAX_SELECTED_STATIONS} stations atteint.
        </p>
      )}
    </div>
  );
}
