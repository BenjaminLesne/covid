import { describe, expect, it } from "vitest";
import { mergeForecasts, type ForecastSnapshot } from "./composite-forecast";

describe("mergeForecasts", () => {
  it("returns latest prediction per target_week when multiple snapshots exist", () => {
    const snapshots: ForecastSnapshot[] = [
      { snapshotDate: "2025-01-01", targetWeek: "2025-W03", predictedValue: 100 },
      { snapshotDate: "2025-01-08", targetWeek: "2025-W03", predictedValue: 120 },
      { snapshotDate: "2025-01-01", targetWeek: "2025-W04", predictedValue: 200 },
      { snapshotDate: "2025-01-15", targetWeek: "2025-W04", predictedValue: 180 },
      { snapshotDate: "2025-01-08", targetWeek: "2025-W04", predictedValue: 190 },
    ];

    const result = mergeForecasts(snapshots);

    expect(result).toEqual([
      { targetWeek: "2025-W03", predictedValue: 120, snapshotDate: "2025-01-08" },
      { targetWeek: "2025-W04", predictedValue: 180, snapshotDate: "2025-01-15" },
    ]);
  });

  it("returns all weeks when each target_week has only one snapshot", () => {
    const snapshots: ForecastSnapshot[] = [
      { snapshotDate: "2025-01-01", targetWeek: "2025-W01", predictedValue: 50 },
      { snapshotDate: "2025-01-08", targetWeek: "2025-W02", predictedValue: 60 },
      { snapshotDate: "2025-01-15", targetWeek: "2025-W03", predictedValue: 70 },
    ];

    const result = mergeForecasts(snapshots);

    expect(result).toEqual([
      { targetWeek: "2025-W01", predictedValue: 50, snapshotDate: "2025-01-01" },
      { targetWeek: "2025-W02", predictedValue: 60, snapshotDate: "2025-01-08" },
      { targetWeek: "2025-W03", predictedValue: 70, snapshotDate: "2025-01-15" },
    ]);
  });

  it("returns empty array for empty input", () => {
    expect(mergeForecasts([])).toEqual([]);
  });

  it("results are sorted by targetWeek ascending", () => {
    const snapshots: ForecastSnapshot[] = [
      { snapshotDate: "2025-02-01", targetWeek: "2025-W10", predictedValue: 300 },
      { snapshotDate: "2025-01-01", targetWeek: "2025-W02", predictedValue: 100 },
      { snapshotDate: "2025-01-15", targetWeek: "2025-W05", predictedValue: 200 },
    ];

    const result = mergeForecasts(snapshots);

    expect(result.map((r) => r.targetWeek)).toEqual([
      "2025-W02",
      "2025-W05",
      "2025-W10",
    ]);
  });
});
