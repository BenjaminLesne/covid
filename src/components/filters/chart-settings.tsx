"use client";

import { Settings } from "lucide-react";
import { useChartSettings } from "@/hooks/use-chart-settings";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function ChartSettings() {
  const { showUpdates, setShowUpdates } = useChartSettings();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56" align="end">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="show-updates" className="text-sm font-normal">
            Afficher les mises à jour
          </Label>
          <Switch
            id="show-updates"
            checked={showUpdates}
            onCheckedChange={(checked) => void setShowUpdates(checked || null)}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
