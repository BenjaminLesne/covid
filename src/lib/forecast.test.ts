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

/** Generate a realistic seasonal series (200+ points, yearly wave pattern). */
function makeSeasonalSeries(length = 200, startYear = 2021, startWeek = 1) {
  const values = Array.from({ length }, (_, i) =>
    500 + 300 * Math.sin((2 * Math.PI * i) / 52) + Math.random() * 50,
  );
  return makeSeries(values, startYear, startWeek);
}

describe("forecastWastewater", () => {
  it("returns 3 forecast points by default for seasonal input", () => {
    const series = makeSeasonalSeries();
    const result = forecastWastewater(series);

    expect(result).toHaveLength(3);
    for (const pt of result) {
      expect(pt.predictedValue).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(pt.predictedValue)).toBe(true);
    }
  });

  it("returns correct number of weeks when horizonWeeks specified", () => {
    const series = makeSeasonalSeries();

    const result5 = forecastWastewater(series, 5);
    expect(result5).toHaveLength(5);

    const result1 = forecastWastewater(series, 1);
    expect(result1).toHaveLength(1);
  });

  it("week strings are correctly incremented from last input week", () => {
    const series = makeSeasonalSeries(200, 2021, 1);
    const lastWeek = series[series.length - 1].week;

    const result = forecastWastewater(series);
    expect(result).toHaveLength(3);

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
    const series = makeSeasonalSeries();
    const result = forecastWastewater(series);

    for (const pt of result) {
      expect(pt.lowerBound).toBeLessThanOrEqual(pt.predictedValue);
      expect(pt.predictedValue).toBeLessThanOrEqual(pt.upperBound);
    }
  });

  it("all predictions are clamped to >= 0", () => {
    const series = makeSeasonalSeries();
    const result = forecastWastewater(series);

    for (const pt of result) {
      expect(pt.predictedValue).toBeGreaterThanOrEqual(0);
      expect(pt.lowerBound).toBeGreaterThanOrEqual(0);
      expect(pt.upperBound).toBeGreaterThanOrEqual(0);
    }
  });

  it("returns empty array when fewer than 104 data points", () => {
    const values = Array.from({ length: 100 }, (_, i) => 500 + i);
    const series = makeSeries(values);
    const result = forecastWastewater(series);
    expect(result).toHaveLength(0);
  });

  it("handles series with null values", () => {
    const values: (number | null)[] = Array.from({ length: 200 }, (_, i) =>
      i % 5 === 0 ? null : 500 + 300 * Math.sin((2 * Math.PI * i) / 52),
    );
    const series = makeSeries(values);
    const result = forecastWastewater(series);

    expect(result).toHaveLength(3);
    for (const pt of result) {
      expect(pt.lowerBound).toBeLessThanOrEqual(pt.predictedValue);
      expect(pt.predictedValue).toBeLessThanOrEqual(pt.upperBound);
    }
  });
});
