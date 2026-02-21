"use client";

import { useCallback, useMemo } from "react";
import { useQueryState, parseAsString } from "nuqs";
import { FRENCH_DEPARTMENTS } from "@/lib/constants";

export function useDepartmentPreferences() {
  const [department, setRaw] = useQueryState(
    "dep",
    parseAsString.withOptions({ history: "replace" })
  );

  const setDepartment = useCallback(
    (code: string | null) => void setRaw(code),
    [setRaw]
  );

  const departmentLabel = useMemo(() => {
    if (!department) return "France entière";
    const dep = FRENCH_DEPARTMENTS.find((d) => d.code === department);
    return dep ? dep.name : department;
  }, [department]);

  return { department, setDepartment, departmentLabel };
}
