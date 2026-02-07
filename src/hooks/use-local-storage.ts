"use client";

import { useState, useCallback, useSyncExternalStore } from "react";

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
        } catch {
          // localStorage full or unavailable — ignore
        }
        return nextValue;
      });
    },
    [key]
  );

  // Return default on server to avoid hydration mismatch
  return [isClient ? storedValue : defaultValue, setValue];
}
