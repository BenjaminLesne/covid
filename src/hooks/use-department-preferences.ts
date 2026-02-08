"use client";

import { useCallback, useMemo } from "react";
import { useLocalStorage } from "./use-local-storage";
import { FRENCH_DEPARTMENTS } from "@/lib/constants";

const STORAGE_KEY = "eauxvid:clinical-department";

/**
 * Hook for managing the selected department for clinical data.
 * `null` means "France entière" (national level).
 */
export function useDepartmentPreferences() {
  const [department, setRaw] = useLocalStorage<string | null>(
    STORAGE_KEY,
    null
  );

  const setDepartment = useCallback(
    (code: string | null) => setRaw(code),
    [setRaw]
  );

  const departmentLabel = useMemo(() => {
    if (!department) return "France entière";
    const dep = FRENCH_DEPARTMENTS.find((d) => d.code === department);
    return dep ? dep.name : department;
  }, [department]);

  return { department, setDepartment, departmentLabel };
}
