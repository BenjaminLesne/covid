"use client";

import { useState, useCallback, useEffect, useSyncExternalStore } from "react";

function getServerSnapshot() {
  return false;
}

function subscribeToHydration() {
  // No-op: hydration status doesn't change after mount
  return () => {};
}

/**
 * Generic hook for reading/writing typed values to localStorage.
 * Returns [value, setValue] similar to useState.
 * Falls back to defaultValue on SSR or if localStorage is unavailable.
 *
 * Multiple hook instances with the same key stay in sync via custom events.
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Detect client vs server without useEffect
  const isClient = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    getServerSnapshot
  );

  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const item = localStorage.getItem(key);
      if (item !== null) {
        return JSON.parse(item) as T;
      }
    } catch {
      // localStorage unavailable or corrupted — keep default
    }
    return defaultValue;
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const nextValue =
          value instanceof Function ? value(prev) : value;
        try {
          localStorage.setItem(key, JSON.stringify(nextValue));
          // Notify other hook instances with the same key asynchronously
          // to avoid "setState during render" when multiple components
          // share the same localStorage key.
          queueMicrotask(() => {
            window.dispatchEvent(
              new CustomEvent("eauxvid-storage", { detail: { key } })
            );
          });
        } catch {
          // localStorage full or unavailable — ignore
        }
        return nextValue;
      });
    },
    [key]
  );

  // Sync when another hook instance updates the same key
  useEffect(() => {
    function handleSync(e: Event) {
      const detail = (e as CustomEvent<{ key: string }>).detail;
      if (detail.key !== key) return;
      try {
        const item = localStorage.getItem(key);
        if (item !== null) {
          setStoredValue(JSON.parse(item) as T);
        }
      } catch {
        // ignore
      }
    }
    window.addEventListener("eauxvid-storage", handleSync);
    return () => window.removeEventListener("eauxvid-storage", handleSync);
  }, [key]);

  // Return default on server to avoid hydration mismatch
  return [isClient ? storedValue : defaultValue, setValue];
}
