import { describe, expect, it, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDateRange } from "./use-date-range";
import { DEFAULT_DATE_RANGE_MONTHS } from "@/lib/constants";

describe("useDateRange", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to last 6 months on first visit", () => {
    const { result } = renderHook(() => useDateRange());
    const now = new Date();
    const expectedFrom = new Date();
    expectedFrom.setMonth(expectedFrom.getMonth() - DEFAULT_DATE_RANGE_MONTHS);

    // Allow 1 day tolerance for date edge cases
    const diffFrom = Math.abs(
      result.current.fromDate.getTime() - expectedFrom.getTime()
    );
    expect(diffFrom).toBeLessThan(86400000); // < 1 day

    const diffTo = Math.abs(
      result.current.toDate.getTime() - now.getTime()
    );
    expect(diffTo).toBeLessThan(86400000);
  });

  it("stores date range as ISO strings", () => {
    const { result } = renderHook(() => useDateRange());
    expect(result.current.dateRange.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.current.dateRange.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("sets a custom date range", () => {
    const { result } = renderHook(() => useDateRange());
    const from = new Date("2024-01-01");
    const to = new Date("2024-06-30");
    act(() => {
      result.current.setRange(from, to);
    });
    expect(result.current.dateRange.from).toBe("2024-01-01");
    expect(result.current.dateRange.to).toBe("2024-06-30");
  });

  it("persists date range to localStorage", () => {
    const { result } = renderHook(() => useDateRange());
    const from = new Date("2025-03-01");
    const to = new Date("2025-09-01");
    act(() => {
      result.current.setRange(from, to);
    });
    const stored = JSON.parse(localStorage.getItem("eauxvid:date-range")!);
    expect(stored.from).toBe("2025-03-01");
    expect(stored.to).toBe("2025-09-01");
  });

  it("restores date range from localStorage on mount", () => {
    localStorage.setItem(
      "eauxvid:date-range",
      JSON.stringify({ from: "2024-02-15", to: "2024-08-15" })
    );
    const { result } = renderHook(() => useDateRange());
    expect(result.current.dateRange.from).toBe("2024-02-15");
    expect(result.current.dateRange.to).toBe("2024-08-15");
  });

  it("resets to default range", () => {
    const { result } = renderHook(() => useDateRange());
    act(() => {
      result.current.setRange(
        new Date("2020-01-01"),
        new Date("2020-06-01")
      );
    });
    expect(result.current.dateRange.from).toBe("2020-01-01");

    act(() => {
      result.current.reset();
    });

    // After reset, should be back to ~6 months ago
    const expectedFrom = new Date();
    expectedFrom.setMonth(expectedFrom.getMonth() - DEFAULT_DATE_RANGE_MONTHS);
    const diffFrom = Math.abs(
      result.current.fromDate.getTime() - expectedFrom.getTime()
    );
    expect(diffFrom).toBeLessThan(86400000);
  });

  it("fromDate and toDate are Date objects", () => {
    const { result } = renderHook(() => useDateRange());
    expect(result.current.fromDate).toBeInstanceOf(Date);
    expect(result.current.toDate).toBeInstanceOf(Date);
  });
});
