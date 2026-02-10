"use client";

import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RefreshButton() {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => window.location.reload()}
      aria-label="Rafraîchir la page"
    >
      <RotateCw className="h-4 w-4" />
    </Button>
  );
}
