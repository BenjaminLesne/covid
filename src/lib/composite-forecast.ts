export type ForecastSnapshot = {
  snapshotDate: string;
  targetWeek: string;
  predictedValue: number;
};

export type MergedForecast = {
  targetWeek: string;
  predictedValue: number;
  snapshotDate: string;
};

/**
 * For each targetWeek, keep only the row with the latest snapshotDate.
 * Returns results sorted by targetWeek ascending.
 */
export function mergeForecasts(snapshots: ForecastSnapshot[]): MergedForecast[] {
  const latest = new Map<string, ForecastSnapshot>();

  for (const s of snapshots) {
    const existing = latest.get(s.targetWeek);
    if (!existing || s.snapshotDate > existing.snapshotDate) {
      latest.set(s.targetWeek, s);
    }
  }

  return Array.from(latest.values())
    .sort((a, b) => a.targetWeek.localeCompare(b.targetWeek))
    .map(({ targetWeek, predictedValue, snapshotDate }) => ({
      targetWeek,
      predictedValue,
      snapshotDate,
    }));
}
