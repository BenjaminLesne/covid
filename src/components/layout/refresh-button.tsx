"use client";

import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

function clearSiteData() {
  // Clear localStorage
  localStorage.clear();

  // Clear sessionStorage
  sessionStorage.clear();

  // Clear all cookies for this domain
  document.cookie.split(";").forEach((cookie) => {
    const name = cookie.split("=")[0].trim();
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  });

  // Clear Cache API caches
  if ("caches" in window) {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }

  // Strip search params and reload
  window.location.replace(window.location.origin + window.location.pathname);
}

export function RefreshButton() {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={clearSiteData}
      aria-label="Rafraîchir la page"
    >
      <RotateCw className="h-4 w-4" />
    </Button>
  );
}
