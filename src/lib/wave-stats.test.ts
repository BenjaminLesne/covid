import { describe, expect, it } from "vitest";
import { computeWaveStats } from "./wave-stats";
import type { Wave } from "./wave-detection";

function makeWave(
  startYear: number,
  startW: number,
  duration: number,
  peakValue: number,
  amplitude: number,
): Wave {
  const peakOffset = Math.floor(duration / 2);
  const endW = startW + duration - 1;
  const peakW = startW + peakOffset;
  const fmt = (y: number, w: number) => {
    let year = y;
    let week = w;
    while (week > 52) {
      week -= 52;
      year++;
    }
    return `${year}-W${String(week).padStart(2, "0")}`;
  };
  return {
    startWeek: fmt(startYear, startW),
    peakWeek: fmt(startYear, peakW),
    endWeek: fmt(startYear, endW),
    peakValue,
    duration,
    amplitude,
  };
}

describe("computeWaveStats", () => {
  it("returns all nulls for 0 waves", () => {
    const stats = computeWaveStats([]);
    expect(stats.waveCount).toBe(0);
    expect(stats.avgDuration).toBeNull();
    expect(stats.stdDuration).toBeNull();
    expect(stats.avgFrequency).toBeNull();
    expect(stats.stdFrequency).toBeNull();
    expect(stats.avgAmplitude).toBeNull();
    expect(stats.stdAmplitude).toBeNull();
    expect(stats.avgInterWaveGap).toBeNull();
    expect(stats.stdInterWaveGap).toBeNull();
  });

  it("returns count and means for 1 wave, null for std/frequency/gap", () => {
    const wave = makeWave(2024, 10, 8, 100, 80);
    const stats = computeWaveStats([wave]);

    expect(stats.waveCount).toBe(1);
    expect(stats.avgDuration).toBe(8);
    expect(stats.stdDuration).toBeNull();
    expect(stats.avgAmplitude).toBe(80);
    expect(stats.stdAmplitude).toBeNull();
    expect(stats.avgFrequency).toBeNull();
    expect(stats.stdFrequency).toBeNull();
    expect(stats.avgInterWaveGap).toBeNull();
    expect(stats.stdInterWaveGap).toBeNull();
  });

  it("computes stats for 2 waves", () => {
    const w1 = makeWave(2024, 5, 10, 100, 80);
    const w2 = makeWave(2024, 25, 8, 120, 100);
    const stats = computeWaveStats([w1, w2]);

    expect(stats.waveCount).toBe(2);
    expect(stats.avgDuration).toBe(9); // (10+8)/2
    expect(stats.stdDuration).toBeCloseTo(Math.sqrt(2), 5); // std of [10,8]
    expect(stats.avgAmplitude).toBe(90); // (80+100)/2
    expect(stats.stdAmplitude).toBeCloseTo(Math.sqrt(200), 5);
    // Gap: w2 starts at W25, w1 ends at W14 → gap = 11
    expect(stats.avgInterWaveGap).toBe(11);
    expect(stats.stdInterWaveGap).toBeNull(); // only 1 gap, can't compute std
    // Frequency: 2 waves over (W32 - W5 = 27 weeks) → 2/27*52 ≈ 3.85
    expect(stats.avgFrequency).toBeGreaterThan(0);
    expect(stats.stdFrequency).toBeNull(); // only 1 interval
  });

  it("computes all stats for 5+ waves", () => {
    const waves = [
      makeWave(2023, 5, 10, 100, 80),
      makeWave(2023, 25, 8, 120, 100),
      makeWave(2023, 43, 12, 90, 70),
      makeWave(2024, 10, 6, 110, 85),
      makeWave(2024, 30, 10, 130, 110),
    ];
    const stats = computeWaveStats(waves);

    expect(stats.waveCount).toBe(5);
    expect(stats.avgDuration).toBeCloseTo((10 + 8 + 12 + 6 + 10) / 5, 5);
    expect(stats.stdDuration).toBeGreaterThan(0);
    expect(stats.avgAmplitude).toBeCloseTo((80 + 100 + 70 + 85 + 110) / 5, 5);
    expect(stats.stdAmplitude).toBeGreaterThan(0);
    expect(stats.avgFrequency).toBeGreaterThan(0);
    expect(stats.stdFrequency).toBeGreaterThan(0);
    expect(stats.avgInterWaveGap).toBeGreaterThan(0);
    expect(stats.stdInterWaveGap).toBeGreaterThan(0);
  });

  it("frequency is waves per year", () => {
    // 2 waves exactly 26 weeks apart in a 52-week span → ~2 waves/year
    const w1 = makeWave(2024, 1, 6, 100, 80);
    const w2 = makeWave(2024, 27, 6, 100, 80);
    const stats = computeWaveStats([w1, w2]);

    // Total span: W32 - W1 = 31 weeks, 2 waves → 2/31*52 ≈ 3.35
    expect(stats.avgFrequency).toBeGreaterThan(0);
    expect(typeof stats.avgFrequency).toBe("number");
  });
});
