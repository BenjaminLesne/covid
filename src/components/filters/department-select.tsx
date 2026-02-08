"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Hospital } from "lucide-react";
import { useDepartmentPreferences } from "@/hooks/use-department-preferences";
import { FRENCH_DEPARTMENTS } from "@/lib/constants";
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

export function DepartmentSelect() {
  const [open, setOpen] = useState(false);
  const { department, setDepartment, departmentLabel } =
    useDepartmentPreferences();

  const displayText = department
    ? `${department} — ${departmentLabel}`
    : "France entière";

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium text-muted-foreground">
        Zone géographique — Urgences
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2 truncate text-left">
              <Hospital className="h-4 w-4 shrink-0" />
              {displayText}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command filter={accentInsensitiveFilter}>
            <CommandInput placeholder="Rechercher un département…" />
            <CommandList>
              <CommandEmpty>Aucun département trouvé.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="france entière national"
                  onSelect={() => {
                    setDepartment(null);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      department === null ? "opacity-100" : "opacity-0"
                    )}
                  />
                  France entière
                </CommandItem>
                {FRENCH_DEPARTMENTS.map((dep) => (
                  <CommandItem
                    key={dep.code}
                    value={`${dep.code} ${dep.name}`}
                    onSelect={() => {
                      setDepartment(dep.code);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        department === dep.code ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="mr-2 text-muted-foreground">
                      {dep.code}
                    </span>
                    {dep.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
