"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QueryErrorProps {
  message: string;
  onRetry: () => void;
  className?: string;
}

export function QueryError({ message, onRetry, className }: QueryErrorProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed",
        className,
      )}
    >
      <AlertTriangle className="text-muted-foreground h-8 w-8" />
      <p className="text-muted-foreground text-sm">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Réessayer
      </Button>
    </div>
  );
}
