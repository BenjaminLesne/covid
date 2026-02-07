import { describe, expect, it, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStationPreferences } from "./use-station-preferences";
import { NATIONAL_STATION_ID, MAX_SELECTED_STATIONS } from "@/lib/constants";

describe("useStationPreferences", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to [national] on first visit", () => {
    const { result } = renderHook(() => useStationPreferences());
    expect(result.current.selectedIds).toEqual([NATIONAL_STATION_ID]);
  });

  it("adds a station", () => {
    const { result } = renderHook(() => useStationPreferences());
    act(() => {
      result.current.addStation("station-1");
    });
    expect(result.current.selectedIds).toContain("station-1");
    expect(result.current.selectedIds).toContain(NATIONAL_STATION_ID);
  });

  it("removes a station", () => {
    const { result } = renderHook(() => useStationPreferences());
    act(() => {
      result.current.addStation("station-1");
    });
    act(() => {
      result.current.removeStation("station-1");
    });
    expect(result.current.selectedIds).not.toContain("station-1");
    expect(result.current.selectedIds).toContain(NATIONAL_STATION_ID);
  });

  it("cannot remove national station", () => {
    const { result } = renderHook(() => useStationPreferences());
    act(() => {
      result.current.removeStation(NATIONAL_STATION_ID);
    });
    expect(result.current.selectedIds).toContain(NATIONAL_STATION_ID);
  });

  it("toggles a station on and off", () => {
    const { result } = renderHook(() => useStationPreferences());
    act(() => {
      result.current.toggleStation("station-2");
    });
    expect(result.current.isSelected("station-2")).toBe(true);
    act(() => {
      result.current.toggleStation("station-2");
    });
    expect(result.current.isSelected("station-2")).toBe(false);
  });

  it("cannot toggle national station off", () => {
    const { result } = renderHook(() => useStationPreferences());
    act(() => {
      result.current.toggleStation(NATIONAL_STATION_ID);
    });
    expect(result.current.isSelected(NATIONAL_STATION_ID)).toBe(true);
  });

  it("enforces max station limit", () => {
    const { result } = renderHook(() => useStationPreferences());
    for (let i = 0; i < MAX_SELECTED_STATIONS; i++) {
      act(() => {
        result.current.addStation(`station-${i}`);
      });
    }
    expect(result.current.canAddMore).toBe(false);
    act(() => {
      result.current.addStation("one-too-many");
    });
    expect(result.current.selectedIds).not.toContain("one-too-many");
  });

  it("does not add duplicate stations", () => {
    const { result } = renderHook(() => useStationPreferences());
    act(() => {
      result.current.addStation("station-1");
    });
    act(() => {
      result.current.addStation("station-1");
    });
    const count = result.current.selectedIds.filter(
      (id) => id === "station-1"
    ).length;
    expect(count).toBe(1);
  });

  it("persists selection to localStorage", () => {
    const { result } = renderHook(() => useStationPreferences());
    act(() => {
      result.current.addStation("station-1");
    });
    const stored = JSON.parse(
      localStorage.getItem("eauxvid:selected-stations")!
    );
    expect(stored).toContain("station-1");
    expect(stored).toContain(NATIONAL_STATION_ID);
  });

  it("restores selection from localStorage on mount", () => {
    localStorage.setItem(
      "eauxvid:selected-stations",
      JSON.stringify([NATIONAL_STATION_ID, "station-a", "station-b"])
    );
    const { result } = renderHook(() => useStationPreferences());
    expect(result.current.selectedIds).toEqual([
      NATIONAL_STATION_ID,
      "station-a",
      "station-b",
    ]);
  });
});
