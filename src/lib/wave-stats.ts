/**
 * Compute summary statistics from detected waves.
 */

import type { Wave } from "./wave-detection";

export interface WaveStats {
  waveCount: number;
  avgDuration: number | null;
  stdDuration: number | null;
  avgFrequency: number | null;
  stdFrequency: number | null;
  avgAmplitude: number | null;
  stdAmplitude: number | null;
  avgInterWaveGap: number | null;
  stdInterWaveGap: number | null;
}

function mean(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function std(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/** Parse "YYYY-WXX" to a week number relative to some epoch, for computing gaps. */
function weekToAbsolute(week: string): number {
  const match = week.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return 0;
  const year = parseInt(match[1], 10);
  const w = parseInt(match[2], 10);
  return year * 52 + w;
}

export function computeWaveStats(waves: Wave[]): WaveStats {
  if (waves.length === 0) {
    return {
      waveCount: 0,
      avgDuration: null,
      stdDuration: null,
      avgFrequency: null,
      stdFrequency: null,
      avgAmplitude: null,
      stdAmplitude: null,
      avgInterWaveGap: null,
      stdInterWaveGap: null,
    };
  }

  const durations = waves.map((w) => w.duration);
  const amplitudes = waves.map((w) => w.amplitude);

  const avgDuration = mean(durations);
  const stdDuration = waves.length >= 2 ? std(durations) : null;
  const avgAmplitude = mean(amplitudes);
  const stdAmplitude = waves.length >= 2 ? std(amplitudes) : null;

  // Inter-wave gaps (weeks between end of one wave and start of next)
  let avgInterWaveGap: number | null = null;
  let stdInterWaveGap: number | null = null;
  let avgFrequency: number | null = null;
  let stdFrequency: number | null = null;

  if (waves.length >= 2) {
    const gaps: number[] = [];
    for (let i = 1; i < waves.length; i++) {
      const gap = weekToAbsolute(waves[i].startWeek) - weekToAbsolute(waves[i - 1].endWeek);
      gaps.push(gap);
    }
    avgInterWaveGap = mean(gaps);
    stdInterWaveGap = gaps.length >= 2 ? std(gaps) : null;

    // Frequency: waves per year — computed from total span
    const totalSpanWeeks =
      weekToAbsolute(waves[waves.length - 1].endWeek) -
      weekToAbsolute(waves[0].startWeek);
    if (totalSpanWeeks > 0) {
      avgFrequency = (waves.length / totalSpanWeeks) * 52;
    }

    // Per-wave frequency estimates for std: each wave center-to-center interval
    if (waves.length >= 3) {
      const intervals: number[] = [];
      for (let i = 1; i < waves.length; i++) {
        const centerA = weekToAbsolute(waves[i - 1].peakWeek);
        const centerB = weekToAbsolute(waves[i].peakWeek);
        const intervalWeeks = centerB - centerA;
        if (intervalWeeks > 0) {
          intervals.push(52 / intervalWeeks); // waves/year for this interval
        }
      }
      stdFrequency = intervals.length >= 2 ? std(intervals) : null;
    }
  }

  return {
    waveCount: waves.length,
    avgDuration,
    stdDuration,
    avgFrequency,
    stdFrequency,
    avgAmplitude,
    stdAmplitude,
    avgInterWaveGap,
    stdInterWaveGap,
  };
}
