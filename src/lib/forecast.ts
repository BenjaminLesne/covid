/**
 * ARIMA-based forecast for wastewater time series.
 *
 * Fits an auto-ARIMA model on smoothed values and predicts
 * the next N weeks with 95% confidence intervals.
 */
import ARIMA from "arima";

interface DataPoint {
  week: string;
  value: number | null;
}

export interface ForecastPoint {
  week: string;
  predictedValue: number;
  lowerBound: number;
  upperBound: number;
}

/**
 * Parse ISO week string "YYYY-WXX" into { year, week }.
 */
function parseISOWeek(w: string): { year: number; week: number } {
  const match = w.match(/^(\d{4})-W(\d{2})$/);
  if (!match) throw new Error(`Invalid ISO week format: ${w}`);
  return { year: parseInt(match[1], 10), week: parseInt(match[2], 10) };
}

/**
 * Format { year, week } back to "YYYY-WXX".
 */
function formatISOWeek(year: number, week: number): string {
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/**
 * Increment an ISO week string by n weeks, handling year boundaries.
 * Uses ISO 8601: most years have 52 weeks, some have 53.
 */
function incrementWeek(weekStr: string, n: number): string {
  const { year, week } = parseISOWeek(weekStr);
  let y = year;
  let w = week + n;

  while (w > weeksInYear(y)) {
    w -= weeksInYear(y);
    y++;
  }
  while (w < 1) {
    y--;
    w += weeksInYear(y);
  }

  return formatISOWeek(y, w);
}

/**
 * Number of ISO weeks in a given year (52 or 53).
 * A year has 53 weeks if Jan 1 is Thursday, or Dec 31 is Thursday.
 */
function weeksInYear(year: number): number {
  const jan1 = new Date(year, 0, 1).getDay();
  const dec31 = new Date(year, 11, 31).getDay();
  return jan1 === 4 || dec31 === 4 ? 53 : 52;
}

/**
 * Forecast the wastewater signal using ARIMA.
 *
 * @param series - Time series sorted by week ascending
 * @param horizonWeeks - Number of weeks to forecast (default 3)
 * @returns Array of forecast points with predictions and confidence intervals
 */
export function forecastWastewater(
  series: DataPoint[],
  horizonWeeks: number = 3,
): ForecastPoint[] {
  // Filter out nulls, keep order
  const clean = series.filter(
    (d): d is { week: string; value: number } => d.value !== null,
  );

  if (clean.length < 10) return [];

  const values = clean.map((d) => d.value);
  const lastWeek = clean[clean.length - 1].week;

  // Fit auto-ARIMA
  const arima = new ARIMA({ auto: true, verbose: false });
  arima.train(values);
  const [predictions, errors] = arima.predict(horizonWeeks);

  // Z-score for 95% confidence interval
  const z = 1.96;

  return predictions.map((pred, i) => {
    const stderr = errors[i];
    return {
      week: incrementWeek(lastWeek, i + 1),
      predictedValue: pred,
      lowerBound: pred - z * stderr,
      upperBound: pred + z * stderr,
    };
  });
}
