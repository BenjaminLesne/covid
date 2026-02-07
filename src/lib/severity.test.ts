import { describe, expect, it } from "vitest";
import { calculateSeverityLevel, calculateTrend, getSeverityColor } from "./severity";

describe("calculateSeverityLevel", () => {
  // Evenly distributed historical data: 1..100
  const historical = Array.from({ length: 100 }, (_, i) => i + 1);

  it("returns level 1 for values at or below 20th percentile", () => {
    expect(calculateSeverityLevel(1, historical)).toBe(1);
    expect(calculateSeverityLevel(20, historical)).toBe(1);
  });

  it("returns level 2 for values in 20th–40th percentile", () => {
    expect(calculateSeverityLevel(21, historical)).toBe(2);
    expect(calculateSeverityLevel(40, historical)).toBe(2);
  });

  it("returns level 3 for values in 40th–60th percentile", () => {
    expect(calculateSeverityLevel(41, historical)).toBe(3);
    expect(calculateSeverityLevel(60, historical)).toBe(3);
  });

  it("returns level 4 for values in 60th–80th percentile", () => {
    expect(calculateSeverityLevel(61, historical)).toBe(4);
    expect(calculateSeverityLevel(80, historical)).toBe(4);
  });

  it("returns level 5 for values above 80th percentile", () => {
    expect(calculateSeverityLevel(81, historical)).toBe(5);
    expect(calculateSeverityLevel(100, historical)).toBe(5);
  });

  it("returns level 3 (Moderate) when currentValue is null", () => {
    expect(calculateSeverityLevel(null, historical)).toBe(3);
  });

  it("returns level 3 (Moderate) when historical data is empty", () => {
    expect(calculateSeverityLevel(50, [])).toBe(3);
  });

  it("returns level 3 when historical data is all null", () => {
    expect(calculateSeverityLevel(50, [null, null, null])).toBe(3);
  });

  it("handles a single historical value", () => {
    // Single value: all percentiles equal that value
    // currentValue <= that value → level 1; above → level 5
    expect(calculateSeverityLevel(10, [10])).toBe(1);
    expect(calculateSeverityLevel(11, [10])).toBe(5);
  });

  it("filters out null values from historical data", () => {
    const withNulls = [null, 10, null, 20, null, 30, null, 40, null, 50];
    // valid values: [10, 20, 30, 40, 50]
    // p20 = 18, p40 = 26, p60 = 34, p80 = 42
    expect(calculateSeverityLevel(15, withNulls)).toBe(1);
    expect(calculateSeverityLevel(35, withNulls)).toBe(4);
  });

  it("handles boundary values exactly on percentile thresholds", () => {
    // With [10, 20, 30, 40, 50]:
    // p20 = 18, p40 = 26, p60 = 34, p80 = 42
    const values = [10, 20, 30, 40, 50];
    expect(calculateSeverityLevel(18, values)).toBe(1); // exactly on p20
    expect(calculateSeverityLevel(26, values)).toBe(2); // exactly on p40
    expect(calculateSeverityLevel(34, values)).toBe(3); // exactly on p60
    expect(calculateSeverityLevel(42, values)).toBe(4); // exactly on p80
  });
});

describe("calculateTrend", () => {
  it("returns 'increasing' when change exceeds +10%", () => {
    // 111 vs 100 = +11%
    expect(calculateTrend(111, 100)).toBe("increasing");
  });

  it("returns 'decreasing' when change exceeds -10%", () => {
    // 89 vs 100 = -11%
    expect(calculateTrend(89, 100)).toBe("decreasing");
  });

  it("returns 'stable' when change is within ±10%", () => {
    // 105 vs 100 = +5%
    expect(calculateTrend(105, 100)).toBe("stable");
    // 95 vs 100 = -5%
    expect(calculateTrend(95, 100)).toBe("stable");
  });

  it("returns 'stable' when change is exactly ±10%", () => {
    // 110 vs 100 = exactly +10% — not exceeding threshold
    expect(calculateTrend(110, 100)).toBe("stable");
    // 90 vs 100 = exactly -10%
    expect(calculateTrend(90, 100)).toBe("stable");
  });

  it("returns 'stable' when currentValue is null", () => {
    expect(calculateTrend(null, 100)).toBe("stable");
  });

  it("returns 'stable' when twoWeeksAgoValue is null", () => {
    expect(calculateTrend(100, null)).toBe("stable");
  });

  it("returns 'stable' when both values are null", () => {
    expect(calculateTrend(null, null)).toBe("stable");
  });

  it("handles zero twoWeeksAgoValue", () => {
    expect(calculateTrend(5, 0)).toBe("increasing");
    expect(calculateTrend(-5, 0)).toBe("decreasing");
    expect(calculateTrend(0, 0)).toBe("stable");
  });

  it("handles negative values correctly", () => {
    // From -100 to -80: change = (-80 - (-100)) / |-100| = 20/100 = +20%
    expect(calculateTrend(-80, -100)).toBe("increasing");
    // From -100 to -120: change = (-120 - (-100)) / |-100| = -20/100 = -20%
    expect(calculateTrend(-120, -100)).toBe("decreasing");
  });
});

describe("getSeverityColor", () => {
  it("returns green (#22c55e) for level 1", () => {
    expect(getSeverityColor(1)).toBe("#22c55e");
  });

  it("returns lime (#84cc16) for level 2", () => {
    expect(getSeverityColor(2)).toBe("#84cc16");
  });

  it("returns yellow (#eab308) for level 3", () => {
    expect(getSeverityColor(3)).toBe("#eab308");
  });

  it("returns orange (#f97316) for level 4", () => {
    expect(getSeverityColor(4)).toBe("#f97316");
  });

  it("returns red (#ef4444) for level 5", () => {
    expect(getSeverityColor(5)).toBe("#ef4444");
  });
});
