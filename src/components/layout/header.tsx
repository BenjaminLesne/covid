import { Droplets } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function Header() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Droplets className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-bold leading-tight">EauxVid</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Surveillance virale — eaux usées &amp; urgences
            </p>
          </div>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
