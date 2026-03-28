import { describe, expect, it } from "vitest";
import { computeWaveStats, estimateNextWave, absoluteToWeek } from "./wave-stats";
import type { Wave } from "./wave-detection";
import type { ForecastPoint } from "./forecast";

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

/** Helper: generate ForecastPoint[] with configurable slope and CI width. */
function makeForecast(
  startYear: number,
  startWeek: number,
  count: number,
  options: { baseValue?: number; slope?: number; ciWidth?: number } = {},
): ForecastPoint[] {
  const { baseValue = 100, slope = 0, ciWidth = 20 } = options;
  const points: ForecastPoint[] = [];
  for (let i = 0; i < count; i++) {
    const week = startWeek + i;
    let y = startYear;
    let w = week;
    while (w > 52) {
      w -= 52;
      y++;
    }
    const predicted = baseValue + slope * i;
    points.push({
      week: `${y}-W${String(w).padStart(2, "0")}`,
      predictedValue: predicted,
      lowerBound: predicted - ciWidth / 2,
      upperBound: predicted + ciWidth / 2,
    });
  }
  return points;
}

const emptySeries: { week: string; value: number | null }[] = [];

describe("estimateNextWave", () => {
  it("returns null for 0 waves", () => {
    const forecast = makeForecast(2024, 40, 3, { slope: 10 });
    expect(estimateNextWave([], forecast, emptySeries)).toBeNull();
  });

  it("returns null for 1 wave", () => {
    const wave = makeWave(2024, 10, 8, 100, 80);
    const forecast = makeForecast(2024, 20, 3, { slope: 10 });
    expect(estimateNextWave([wave], forecast, emptySeries)).toBeNull();
  });

  it("returns valid estimate for 2 waves with correct estimatedStartWeek", () => {
    // w1 ends at W14 (start 5 + dur 10 - 1), w2 ends at W32 (start 25 + dur 8 - 1)
    // gap = W25 - W14 = 11. Estimated = W32 + 11 = W43
    const w1 = makeWave(2024, 5, 10, 100, 80);
    const w2 = makeWave(2024, 25, 8, 120, 100);
    const forecast = makeForecast(2024, 35, 3, { slope: 10 });

    const result = estimateNextWave([w1, w2], forecast, emptySeries);
    expect(result).not.toBeNull();
    expect(result!.estimatedStartWeek).toBe("2024-W43");
    expect(result!.confidenceLevel).toBeDefined();
    expect(result!.confidenceLabel).toBeDefined();
    expect(result!.method).toContain("vagues");
  });

  it("confidence is 'elevee' when gaps are regular and forecast is rising with tight CI", () => {
    // 4 waves with very regular gaps (~10 weeks between end and start)
    const waves = [
      makeWave(2024, 1, 6, 100, 80),   // ends W06
      makeWave(2024, 16, 6, 100, 80),  // starts W16, gap=10, ends W21
      makeWave(2024, 31, 6, 100, 80),  // starts W31, gap=10, ends W36
      makeWave(2024, 46, 6, 100, 80),  // starts W46, gap=10, ends W51
    ];
    // Rising forecast with tight CI
    const forecast = makeForecast(2025, 1, 3, { baseValue: 100, slope: 20, ciWidth: 10 });

    const result = estimateNextWave(waves, forecast, emptySeries);
    expect(result).not.toBeNull();
    expect(result!.confidenceLevel).toBe("elevee");
    expect(result!.confidenceLabel).toBe("Élevée");
  });

  it("confidence is 'faible' when gaps are irregular and forecast is flat with wide CI", () => {
    // 3 waves with very irregular gaps
    const waves = [
      makeWave(2024, 1, 4, 100, 80),   // ends W04
      makeWave(2024, 8, 4, 100, 80),   // starts W08, gap=4, ends W11
      makeWave(2024, 40, 4, 100, 80),  // starts W40, gap=29, ends W43
    ];
    // Flat forecast with very wide CI
    const forecast = makeForecast(2024, 45, 3, { baseValue: 50, slope: 0, ciWidth: 200 });

    const result = estimateNextWave(waves, forecast, emptySeries);
    expect(result).not.toBeNull();
    expect(result!.confidenceLevel).toBe("faible");
    expect(result!.confidenceLabel).toBe("Faible");
  });

  it("handles waves spanning year boundaries", () => {
    // Wave starting in late 2023, ending in early 2024
    const w1 = makeWave(2023, 48, 8, 100, 80); // ends at 2024-W03 (48+7=55 → year+1, W03)
    const w2 = makeWave(2024, 20, 6, 120, 90); // ends at W25
    const forecast = makeForecast(2024, 30, 3, { slope: 5 });

    const result = estimateNextWave([w1, w2], forecast, emptySeries);
    expect(result).not.toBeNull();
    expect(result!.estimatedStartWeek).toMatch(/^\d{4}-W\d{2}$/);
  });

  it("handles empty forecast array", () => {
    const w1 = makeWave(2024, 5, 10, 100, 80);
    const w2 = makeWave(2024, 25, 8, 120, 100);

    const result = estimateNextWave([w1, w2], [], emptySeries);
    expect(result).not.toBeNull();
    // With empty forecast: forecastCorroboration=0.3, ciScore=0.5
    // gapRegularity depends on single gap (std=0 with 1 gap) → 1 - 0 = 1
    // avg = (1 + 0.3 + 0.5) / 3 = 0.6 → 'moyenne'
    expect(result!.confidenceLevel).toBe("moyenne");
  });
});

describe("absoluteToWeek", () => {
  it("round-trips with weekToAbsolute logic", () => {
    // weekToAbsolute("2024-W10") = 2024*52+10 = 105258
    expect(absoluteToWeek(2024 * 52 + 10)).toBe("2024-W10");
  });

  it("handles week 1", () => {
    expect(absoluteToWeek(2024 * 52 + 1)).toBe("2024-W01");
  });

  it("handles week 52 boundary (absWeek % 52 === 0)", () => {
    // 2024*52 → year=2024, week=0 → year=2023, week=52
    expect(absoluteToWeek(2024 * 52)).toBe("2023-W52");
  });
});
