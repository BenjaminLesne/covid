"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Generic hook for reading/writing typed values to localStorage.
 * Returns [value, setValue] similar to useState.
 * Falls back to defaultValue on SSR or if localStorage is unavailable.
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(defaultValue);
  const [isHydrated, setIsHydrated] = useState(false);

  // Read from localStorage after mount (client-side only)
  useEffect(() => {
    try {
      const item = localStorage.getItem(key);
      if (item !== null) {
        setStoredValue(JSON.parse(item) as T);
      }
    } catch {
      // localStorage unavailable or corrupted — keep default
    }
    setIsHydrated(true);
  }, [key]);

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

  // Return default until hydrated to avoid flash
  return [isHydrated ? storedValue : defaultValue, setValue];
}
