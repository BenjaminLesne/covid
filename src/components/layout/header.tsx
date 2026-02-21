import Link from "next/link";
import { Droplets, Menu, Info } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { RefreshButton } from "@/components/layout/refresh-button";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";

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
        <div className="flex items-center gap-3">
          <Link
            href="/info"
            className="hidden text-sm text-muted-foreground hover:text-foreground sm:block"
          >
            À propos des données
          </Link>
          <RefreshButton />
          <ThemeToggle />

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="sm:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <nav className="flex flex-col gap-4 pt-8">
                <Link
                  href="/info"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <Info className="h-4 w-4" />
                  À propos des données
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
