/**
 * Wave detection algorithm for wastewater time series.
 *
 * Uses a derivative-based approach on smoothed values to identify
 * individual Covid waves: starts when sustained upward trend begins,
 * ends when value returns to baseline.
 */

/** A single detected wave in the time series. */
export interface Wave {
  startWeek: string;
  peakWeek: string;
  endWeek: string;
  peakValue: number;
  /** Duration in weeks */
  duration: number;
  /** Peak value minus baseline (avg of start/end values) */
  amplitude: number;
}

interface DataPoint {
  week: string;
  value: number | null;
}

/**
 * Detect waves in a smoothed wastewater time series.
 *
 * Algorithm:
 * 1. Filter out nulls and compute a rolling median baseline
 * 2. A wave starts when the value rises above baseline by a threshold
 * 3. The peak is the maximum value within the wave
 * 4. The wave ends when the value falls back to baseline
 * 5. Incomplete waves at boundaries are excluded
 */
export function detectWaves(series: DataPoint[]): Wave[] {
  // Filter out nulls
  const data = series.filter(
    (d): d is { week: string; value: number } => d.value !== null,
  );

  if (data.length < 10) return [];

  // Compute baseline using rolling percentile (25th) over wide window
  const baselineWindow = 20;
  const baselines = computeRollingBaseline(
    data.map((d) => d.value),
    baselineWindow,
  );

  // Minimum rise above baseline to count as a wave (relative threshold)
  const globalRange =
    Math.max(...data.map((d) => d.value)) -
    Math.min(...data.map((d) => d.value));
  const threshold = globalRange * 0.1;

  // State machine: find wave regions
  const waves: Wave[] = [];
  let inWave = false;
  let waveStart = -1;
  let peakIdx = -1;
  let peakVal = -Infinity;

  // Require sustained rise: at least 3 consecutive points above baseline
  for (let i = 0; i < data.length; i++) {
    const aboveBaseline = data[i].value - baselines[i] > threshold;

    if (!inWave) {
      if (aboveBaseline) {
        // Check if this is sustained (look ahead 2 more points)
        const sustained =
          i + 2 < data.length &&
          data[i + 1].value - baselines[i + 1] > threshold * 0.5 &&
          data[i + 2].value - baselines[i + 2] > threshold * 0.5;
        if (sustained) {
          inWave = true;
          waveStart = i;
          peakIdx = i;
          peakVal = data[i].value;
        }
      }
    } else {
      if (data[i].value > peakVal) {
        peakVal = data[i].value;
        peakIdx = i;
      }

      if (!aboveBaseline) {
        // Wave ended
        const startVal = data[waveStart].value;
        const endVal = data[i].value;
        const baselineAvg = (startVal + endVal) / 2;
        const duration = i - waveStart + 1;

        // Only count waves with meaningful duration
        if (duration >= 4) {
          waves.push({
            startWeek: data[waveStart].week,
            peakWeek: data[peakIdx].week,
            endWeek: data[i].week,
            peakValue: peakVal,
            duration,
            amplitude: peakVal - baselineAvg,
          });
        }

        inWave = false;
        peakVal = -Infinity;
      }
    }
  }

  // Do NOT include incomplete wave at end (per acceptance criteria)

  return waves;
}

/** Compute rolling baseline using 25th percentile over a window. */
function computeRollingBaseline(values: number[], window: number): number[] {
  const halfWin = Math.floor(window / 2);
  return values.map((_, i) => {
    const start = Math.max(0, i - halfWin);
    const end = Math.min(values.length, i + halfWin + 1);
    const windowValues = values.slice(start, end).sort((a, b) => a - b);
    // 25th percentile
    const pIdx = Math.floor(windowValues.length * 0.25);
    return windowValues[pIdx];
  });
}
