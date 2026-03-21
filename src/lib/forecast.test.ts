import { describe, expect, it } from "vitest";
import { forecastWastewater } from "./forecast";

/** Helper: generate a series of { week, value } from an array of values. */
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

describe("forecastWastewater", () => {
  it("returns 3 forecast points by default for sinusoidal input", () => {
    // 30-week sinusoidal series
    const values = Array.from({ length: 30 }, (_, i) =>
      50 + 20 * Math.sin((2 * Math.PI * i) / 12),
    );
    const series = makeSeries(values);
    const result = forecastWastewater(series);

    expect(result).toHaveLength(3);
    // Values should be in a reasonable range (not wildly off from input range 30-70)
    for (const pt of result) {
      expect(pt.predictedValue).toBeGreaterThan(-50);
      expect(pt.predictedValue).toBeLessThan(150);
    }
  });

  it("returns near-constant forecast for flat/constant input", () => {
    const values = Array(30).fill(42);
    const series = makeSeries(values);
    const result = forecastWastewater(series);

    expect(result).toHaveLength(3);
    for (const pt of result) {
      // Forecast should be close to 42
      expect(pt.predictedValue).toBeCloseTo(42, 0);
    }
  });

  it("returns correct number of weeks when horizonWeeks specified", () => {
    const values = Array.from({ length: 30 }, (_, i) => 10 + i);
    const series = makeSeries(values);

    const result5 = forecastWastewater(series, 5);
    expect(result5).toHaveLength(5);

    const result1 = forecastWastewater(series, 1);
    expect(result1).toHaveLength(1);
  });

  it("week strings are correctly incremented from last input week", () => {
    const values = Array(20).fill(10);
    // Start at week 50 of 2023 — forecast should cross into 2024
    const series = makeSeries(values, 2023, 50);
    // Last data week: 2023-W50 + 19 = week 69 → 2024-W17
    const lastWeek = series[series.length - 1].week;

    const result = forecastWastewater(series);
    expect(result).toHaveLength(3);

    // Parse last data week and verify forecast weeks follow sequentially
    const lastMatch = lastWeek.match(/^(\d{4})-W(\d{2})$/)!;
    let y = parseInt(lastMatch[1], 10);
    let w = parseInt(lastMatch[2], 10);

    for (const pt of result) {
      w++;
      if (w > 52) {
        w -= 52;
        y++;
      }
      const expected = `${y}-W${String(w).padStart(2, "0")}`;
      expect(pt.week).toBe(expected);
    }
  });

  it("lowerBound <= predictedValue <= upperBound for each forecast point", () => {
    const values = Array.from({ length: 30 }, (_, i) =>
      50 + 20 * Math.sin((2 * Math.PI * i) / 10),
    );
    const series = makeSeries(values);
    const result = forecastWastewater(series);

    for (const pt of result) {
      expect(pt.lowerBound).toBeLessThanOrEqual(pt.predictedValue);
      expect(pt.predictedValue).toBeLessThanOrEqual(pt.upperBound);
    }
  });

  it("returns empty array when fewer than 10 data points", () => {
    const series = makeSeries([1, 2, 3, 4, 5]);
    const result = forecastWastewater(series);
    expect(result).toHaveLength(0);
  });

  it("handles series with null values", () => {
    // 30 values with some nulls — still enough non-null for forecast
    const values: (number | null)[] = Array.from({ length: 30 }, (_, i) =>
      i % 5 === 0 ? null : 20 + i,
    );
    const series = makeSeries(values);
    const result = forecastWastewater(series);

    // Should still produce forecast (24 non-null values > 10 minimum)
    expect(result).toHaveLength(3);
    for (const pt of result) {
      expect(pt.lowerBound).toBeLessThanOrEqual(pt.predictedValue);
      expect(pt.predictedValue).toBeLessThanOrEqual(pt.upperBound);
    }
  });
});
