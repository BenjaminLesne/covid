# PRD: Wave Statistics & Predictions

## Introduction

Add a new section to the dashboard that analyzes historical wastewater Covid waves (duration, frequency, amplitude) and forecasts future waves using ARIMA/Prophet-style time-series modeling. Predictions appear as a grey continuation of the real data on the main chart, with a confidence band. The Rougeole chart is removed.

## Goals

- Detect and characterize past Covid waves from wastewater data (national + per-station)
- Compute statistics: wave count, average duration, frequency, amplitude, with variance/std dev
- Forecast the next ~3 weeks (until next data update) with confidence intervals
- Display predictions as a grey curve + confidence band on the existing main chart
- Remove the Rougeole section from the dashboard

## User Stories

### US-060: Remove Rougeole chart from dashboard

**Description:** As a user, I no longer need the Rougeole chart cluttering the dashboard.

**Acceptance Criteria:**

- [ ] `RougeoleChart` component removed from `page.tsx`
- [ ] Rougeole mention removed from page description text
- [ ] Component file can stay (no dead-code cleanup required)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-061: Wave detection algorithm (backend)

**Description:** As a developer, I need a wave detection algorithm that identifies individual Covid waves from the smoothed wastewater time series.

**Acceptance Criteria:**

- [ ] New module `src/lib/wave-detection.ts` exports a `detectWaves(series)` function
- [ ] Uses derivative-based approach on smoothed values: wave starts when sustained upward trend begins, ends when value returns to baseline
- [ ] Each detected wave includes: `startWeek`, `peakWeek`, `endWeek`, `peakValue`, `duration` (weeks), `amplitude` (peak - baseline)
- [ ] Works on both national (`national_54`) and per-station series
- [ ] Handles edge cases: incomplete waves at series boundaries, missing data gaps
- [ ] Unit tests with synthetic data covering: single wave, multiple waves, noisy data, no waves
- [ ] Typecheck passes

### US-062: Wave statistics computation (backend)

**Description:** As a developer, I need to compute summary statistics from detected waves.

**Acceptance Criteria:**

- [ ] New module `src/lib/wave-stats.ts` exports a `computeWaveStats(waves)` function
- [ ] Returns: `waveCount`, `avgDuration` (weeks), `stdDuration`, `avgFrequency` (waves/year), `stdFrequency`, `avgAmplitude`, `stdAmplitude`, `avgInterWaveGap` (weeks), `stdInterWaveGap`
- [ ] All stats include mean + standard deviation (variance)
- [ ] Handles edge cases: 0 or 1 wave (return nulls for stats requiring 2+ waves)
- [ ] Unit tests
- [ ] Typecheck passes

### US-063: Time-series forecasting (backend)

**Description:** As a developer, I need an ARIMA or Prophet-style forecast of the wastewater signal to predict upcoming waves.

**Acceptance Criteria:**

- [ ] New module `src/lib/forecast.ts` exports a `forecastWastewater(series, horizonWeeks)` function
- [ ] Uses the `arima` npm package (pure JS ARIMA implementation)
- [ ] Returns array of `{ week, predictedValue, lowerBound, upperBound }` for the forecast horizon
- [ ] Confidence interval widens over time (reflecting increasing uncertainty)
- [ ] Default horizon: 3 weeks (gap until next data update)
- [ ] Works on both national and per-station series (updates with station selection)
- [ ] Unit tests with known-pattern data (e.g., sinusoidal input should produce sinusoidal forecast)
- [ ] Typecheck passes

### US-064: tRPC endpoints for wave stats and forecast

**Description:** As a frontend developer, I need API endpoints to fetch wave statistics and forecast data.

**Acceptance Criteria:**

- [ ] New tRPC router `src/server/trpc/routers/wave-analysis.ts`
- [ ] Procedure `waveAnalysis.getWaveStats`: input `{ stationId?: string }` (default national), returns wave list + summary stats
- [ ] Procedure `waveAnalysis.getForecast`: input `{ stationId?: string }`, returns 3-week forecast series + wave stats summary
- [ ] Both procedures reuse existing wastewater data queries (no new DB tables)
- [ ] Computation happens server-side (not shipped to client)
- [ ] Router registered in root router
- [ ] Typecheck passes

### US-064b: Persist national forecast snapshots for retrospective comparison

**Description:** As a user, I want past predictions stored so I can later compare what was predicted vs what actually happened.

**Acceptance Criteria:**

- [ ] New DB table `forecast_snapshots`: `id` (serial PK), `created_at` (timestamp, when forecast was generated), `target_week` (varchar, ISO week predicted), `predicted_value` (doublePrecision), `lower_bound` (doublePrecision), `upper_bound` (doublePrecision)
- [ ] Only stores national (`national_54`) forecasts — not per-station
- [ ] Snapshot saved automatically during daily sync (`/api/sync`) — after wastewater data is refreshed, run forecast and persist the 3-week predictions
- [ ] Unique constraint on `(created_at::date, target_week)` to avoid duplicates on re-runs within same day
- [ ] New tRPC procedure `waveAnalysis.getForecastHistory`: returns past snapshots so UI can overlay predicted vs actual
- [ ] Drizzle schema + migration generated
- [ ] Typecheck passes

### US-065: Render forecast on main chart as grey curve with confidence band

**Description:** As a user, I want to see the predicted wastewater trend as a grey line continuing from the last real data point, with a shaded confidence band.

**Acceptance Criteria:**

- [ ] Forecast line rendered as grey dashed `<Line>` on the existing `WastewaterChart`
- [ ] Confidence band rendered as grey semi-transparent `<Area>` between lower/upper bounds
- [ ] Forecast starts exactly where real data ends (no gap, no overlap)
- [ ] X-axis extends to accommodate forecast weeks
- [ ] Legend entry: "Prévision" with grey styling, toggleable via existing hidden mechanism
- [ ] Forecast updates when station selection changes (national or per-station)
- [ ] Loading state while forecast computes
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-066: Wave statistics panel on dashboard

**Description:** As a user, I want to see key wave statistics (average duration, frequency, next wave estimate) in a visible section on the dashboard.

**Acceptance Criteria:**

- [ ] New section on the dashboard below the chart+map row (replaces Rougeole position)
- [ ] Card-based layout showing: wave count, avg duration ± std, avg frequency ± std, avg amplitude ± std, avg gap between waves ± std
- [ ] If forecast available: "Prochaine vague estimée: semaine YYYY-WXX" with confidence range
- [ ] Values formatted in French locale (comma decimals, French labels)
- [ ] Responsive: 2-col on mobile, 4-col on desktop
- [ ] Loading skeleton while data fetches
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: Detect waves using derivative analysis on smoothed wastewater values — a wave begins when the smoothed signal rises above a rolling baseline by a threshold, peaks at the local maximum, and ends when it returns near baseline
- FR-2: Compute per-wave metrics: start week, peak week, end week, duration, amplitude (peak minus baseline)
- FR-3: Aggregate statistics across all detected waves: count, mean/std of duration, mean/std of frequency, mean/std of amplitude, mean/std of inter-wave gap
- FR-4: Forecast future values using ARIMA or equivalent time-series model with seasonal decomposition
- FR-5: Produce 95% confidence intervals that widen with forecast horizon
- FR-6: Render forecast as grey dashed line + shaded confidence area on the main Recharts chart
- FR-7: Display wave statistics in a card grid below the chart section
- FR-8: All computation server-side via tRPC; no heavy stats libraries shipped to browser
- FR-9: Remove Rougeole chart and references from the main dashboard page
- FR-10: Persist national forecast snapshots to DB during each sync run for later predicted-vs-actual comparison

## Non-Goals

- No new database tables except `forecast_snapshots` for prediction history
- No real-time or streaming updates — forecast refreshes on page load / filter change
- No per-department forecasts (only national or per-station)
- No machine learning models requiring training data pipelines
- No export/download of statistics
- No alerts or notifications about predicted waves

## Technical Considerations

- **Stats library**: Use [`arima`](https://www.npmjs.com/package/arima) (pure JS ARIMA implementation). Use [`simple-statistics`](https://www.npmjs.com/package/simple-statistics) for basic stats if needed. No Python/R dependencies.
- **Smoothed values**: Use `smoothed_value` column (GAM-smoothed by source) as input for wave detection — raw values are too noisy
- **Recharts**: `<Area>` component with `fillOpacity` for confidence band, `<Line>` for forecast. Both integrate into existing `<ComposedChart>`
- **Performance**: National series is ~150-200 data points (weekly since 2022). ARIMA on this size is fast. Per-station may need caching if slow.
- **Existing severity system** (`src/lib/severity.ts`): Wave amplitude can inform severity classification but is separate from it

## Success Metrics

- Users can see past wave patterns quantified (duration, frequency) at a glance
- Forecast visually extends the chart with clear uncertainty indication
- Statistics match what epidemiologists would compute manually from the same data
- Page load stays under 2s (forecast computation < 500ms server-side)

## Open Questions

- If `arima` npm package produces poor results, consider switching to seasonal decomposition + exponential smoothing as fallback
