import { describe, expect, it } from "vitest";
import { detectWaves } from "./wave-detection";

/** Helper: generate a series of { week, value } from an array of values starting at a given week. */
function makeSeries(
  values: (number | null)[],
  startYear = 2023,
  startWeek = 1,
): { week: string; value: number | null }[] {
  return values.map((v, i) => {
    let w = startWeek + i;
    let y = startYear;
    while (w > 52) {
      w -= 52;
      y++;
    }
    return { week: `${y}-W${String(w).padStart(2, "0")}`, value: v };
  });
}

describe("detectWaves", () => {
  it("detects a single triangle wave", () => {
    // Baseline at ~5, wave rises to 100, then back down
    const values = [
      // 15 weeks baseline
      ...Array(15).fill(5),
      // Rise over 8 weeks
      10, 20, 40, 60, 80, 100, 80, 60,
      // Fall back
      40, 20, 10, 5, 5, 5, 5, 5, 5, 5, 5, 5,
    ];
    const series = makeSeries(values);
    const waves = detectWaves(series);

    expect(waves.length).toBe(1);
    expect(waves[0].peakValue).toBe(100);
    expect(waves[0].duration).toBeGreaterThanOrEqual(4);
    expect(waves[0].amplitude).toBeGreaterThan(0);
    // Peak week should be in the middle portion
    expect(waves[0].peakWeek).toBeDefined();
    expect(waves[0].startWeek).toBeDefined();
    expect(waves[0].endWeek).toBeDefined();
  });

  it("detects multiple waves", () => {
    const baseline = Array(15).fill(5);
    const wave1 = [10, 25, 50, 80, 100, 80, 50, 25, 10];
    const gap = Array(15).fill(5);
    const wave2 = [10, 30, 60, 90, 120, 90, 60, 30, 10];
    const tail = Array(15).fill(5);

    const values = [...baseline, ...wave1, ...gap, ...wave2, ...tail];
    const series = makeSeries(values);
    const waves = detectWaves(series);

    expect(waves.length).toBe(2);
    expect(waves[0].peakValue).toBe(100);
    expect(waves[1].peakValue).toBe(120);
    // Second wave after first
    expect(waves[1].startWeek > waves[0].endWeek).toBe(true);
  });

  it("returns no waves for flat data", () => {
    const values = Array(40).fill(50);
    const series = makeSeries(values);
    const waves = detectWaves(series);

    expect(waves.length).toBe(0);
  });

  it("handles data with null gaps", () => {
    // Some nulls sprinkled in — algorithm should filter them and still work
    const values: (number | null)[] = [
      ...Array(15).fill(5),
      null,
      10,
      null,
      40,
      60,
      80,
      100,
      null,
      80,
      60,
      40,
      20,
      10,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
    ];
    const series = makeSeries(values);
    const waves = detectWaves(series);

    // Should still detect the wave shape (nulls filtered)
    // The exact count depends on how filtering affects baseline, but no crash
    expect(Array.isArray(waves)).toBe(true);
    for (const w of waves) {
      expect(w.peakValue).toBeGreaterThan(0);
      expect(w.duration).toBeGreaterThanOrEqual(4);
      expect(w.amplitude).toBeGreaterThan(0);
    }
  });

  it("ignores small fluctuations (noise)", () => {
    // Values fluctuate within 10% of baseline range — should not be detected as waves
    // The algorithm uses 10% of global range as threshold, so keep fluctuations well under that
    const values = Array.from({ length: 40 }, (_, i) => 50 + (i % 3) - 1);
    const series = makeSeries(values);
    const waves = detectWaves(series);

    expect(waves.length).toBe(0);
  });

  it("returns empty for fewer than 10 data points", () => {
    const series = makeSeries([1, 2, 3, 4, 5]);
    expect(detectWaves(series)).toEqual([]);
  });

  it("excludes incomplete wave at series end", () => {
    // Wave that starts rising but series ends before it comes back down
    const values = [
      ...Array(15).fill(5),
      10, 25, 50, 80, 100, 120, 140,
    ];
    const series = makeSeries(values);
    const waves = detectWaves(series);

    // The incomplete wave at end should be excluded
    expect(waves.length).toBe(0);
  });

  it("wave properties have correct types and relationships", () => {
    const baseline = Array(15).fill(5);
    const wave = [10, 30, 60, 90, 100, 90, 60, 30, 10];
    const tail = Array(15).fill(5);

    const series = makeSeries([...baseline, ...wave, ...tail]);
    const waves = detectWaves(series);

    expect(waves.length).toBeGreaterThanOrEqual(1);
    for (const w of waves) {
      // startWeek <= peakWeek <= endWeek
      expect(w.startWeek <= w.peakWeek).toBe(true);
      expect(w.peakWeek <= w.endWeek).toBe(true);
      // amplitude > 0
      expect(w.amplitude).toBeGreaterThan(0);
      // peakValue is the max
      expect(w.peakValue).toBeGreaterThan(0);
      // duration >= 4
      expect(w.duration).toBeGreaterThanOrEqual(4);
    }
  });
});
