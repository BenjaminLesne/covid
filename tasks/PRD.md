# Product Requirements Document (PRD)

## French Wastewater Covid Surveillance Dashboard

**Version:** 1.0
**Date:** 2026-02-07
**Status:** Draft

---

## 1. App Name (Proposals)

| Name | Rationale |
|------|-----------|
| **EauxVid** | Wordplay on "Eaux" (water) + "Covid". Short, memorable, French-flavored. |
| **VigiEaux** | "Vigilance des Eaux" — evokes monitoring/surveillance. Professional tone. |
| **CovidEaux** | Direct, self-explanatory. Clear purpose at a glance. |

---

## 2. Problem Statement

French citizens and public health observers lack a simple, mobile-friendly tool to visualize SARS-CoV-2 concentration trends in wastewater. The existing government data (SUM'Eau) is published as raw CSV files with no accessible public dashboard. The original Météo Covid app is no longer actively maintained. There is a need for a modern, responsive web app that makes this data easy to understand at a glance.

---

## 3. Target Users

- **Primary:** French citizens who want to understand Covid circulation levels in their area
- **Secondary:** Local health officials, journalists, researchers needing quick access to wastewater data trends

---

## 4. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | **Next.js** (App Router) | T3 stack foundation |
| Language | **TypeScript** | Strict mode |
| API Layer | **tRPC** | Type-safe API between client and server |
| Styling | **Tailwind CSS v4** | Utility-first |
| UI Components | **shadcn/ui** | Radix UI + Tailwind. Includes dropdowns, date pickers, selectors |
| Charts | **shadcn/ui Charts** (Recharts) | Time-series graphs with built-in shadcn styling |
| Map | **React Leaflet** | Free, open-source, no API key required |
| Deployment | **Vercel** | Native Next.js hosting, free tier |
| Database | **None** | Direct API/CSV fetch from government sources |
| Auth | **None** | Public app, preferences in localStorage |

---

## 5. Data Sources

### 5.1 SUM'Eau Indicators

- **Source:** Santé publique France
- **URL (data.gouv.fr):** `https://www.data.gouv.fr/api/1/datasets/r/2963ccb5-344d-4978-bdd3-08aaf9efe514`
- **URL (Odissé JSON):** `https://odisse.santepubliquefrance.fr/explore/dataset/sum-eau-indicateurs/download?format=json`
- **Format:** CSV or JSON
- **Update frequency:** Weekly
- **Content:** Weekly SARS-CoV-2 viral concentration per station + national aggregate
- **Key metric:** Ratio of viral concentration (cg/L, gene E) to ammonium nitrogen concentration (mg N/L), smoothed via hierarchical GAM model
- **Coverage:** 54 wastewater treatment stations across mainland France, from week 30/2022 onward

### 5.2 SUM'Eau Stations (Reference)

- **URL (data.gouv.fr):** `https://www.data.gouv.fr/api/1/datasets/r/dd9cf705-a759-46c6-afd6-bc85cf25f363`
- **URL (Odissé JSON):** `https://odisse.santepubliquefrance.fr/explore/dataset/sumeau_stations/download?format=json`
- **Format:** CSV or JSON
- **Content:** Station metadata
- **Fields:** `nom` (name), `commune` (city), `sandre` (unique ID), `population` (served population), `longitude`, `latitude`

### 5.3 Data Fetching Strategy

- **Server-side:** tRPC procedures fetch and parse CSV/JSON from government APIs
- **Caching:** Next.js `fetch` with `revalidate` set to **6 hours** (data updates weekly, so 6h is plenty fresh while avoiding unnecessary API calls)
- **No database:** All data is fetched, parsed, and served on-the-fly with ISR/caching
- **Fallback:** If the primary data.gouv.fr endpoint is down, fall back to the Odissé portal endpoint (or vice versa)

---

## 6. Features

### 6.1 Time-Series Graph (Main Feature)

**Description:** An interactive line chart showing the evolution of SARS-CoV-2 concentration in wastewater over time.

**Requirements:**
- Built with shadcn/ui Charts (Recharts under the hood)
- **Dual display:** Smoothed trend line (primary, solid line) + raw data points (dots/markers overlay)
- **Default time range:** Last 6 months
- **Date range picker:** Users can select custom start/end dates using shadcn/ui DatePicker
- **Y-axis:** Normalized viral indicator (ratio of SARS-CoV-2 to ammonium nitrogen)
- **X-axis:** Time (weeks)
- **Multiple series:** Each selected city/station is a separate colored line
- **National line:** Always available as a toggle — shows the population-weighted national aggregate
- **Tooltip:** On hover, shows exact value, date, and station name
- **Responsive:** Full-width on mobile, constrained max-width on desktop
- **Legend:** Below chart on mobile, side panel on desktop

### 6.2 City/Station Filter

**Description:** Multi-select searchable dropdown to choose which stations to display on the graph.

**Requirements:**
- Built with shadcn/ui Combobox (multi-select variant)
- Searchable by station name or commune name
- Checkboxes for each station
- "National Average" is a permanent option at the top (enabled by default)
- Selected stations appear as removable tags/chips
- Maximum of **5 stations** selectable at once (plus national) to keep the graph readable
- Persisted in localStorage so returning users see their last selection
- On first visit: only "National Average" is selected

### 6.3 France Map with Severity Icons

**Description:** An interactive map of France showing all 54 monitoring stations with color-coded icons representing current Covid wastewater levels.

**Requirements:**
- Built with React Leaflet
- Map tiles: OpenStreetMap (free, no API key)
- Default view: Mainland France, centered and zoomed to fit all stations
- Each station is represented by a **circular marker** with:
  - **Fill color** based on the 5-level severity system (see Section 7)
  - **Trend arrow** (↑ ↓ →) overlaid or adjacent to the marker
  - **Size** proportional to the station's served population (optional, subtle)
- **On click:** Opens a popup with station name, commune, current value, trend, and a "Add to graph" button
- **On mobile:** Map is full-width, appears above or below the graph (user can scroll)
- **On desktop:** Map sits alongside the graph in a 2-column layout

### 6.4 Severity Indicator System

See Section 7 for full specification.

---

## 7. Severity Level System (5-Level Quintile + Trend Arrow)

### 7.1 Intensity Levels (Quintile-Based)

Levels are calculated by comparing the **most recent week's value** for each station against the **full historical distribution** of that station's data (all weeks since tracking began).

| Level | Percentile Range | Color | Hex | Label |
|-------|-----------------|-------|-----|-------|
| 1 | 0 – 20th | Green | `#22c55e` | Very Low |
| 2 | 20th – 40th | Lime | `#84cc16` | Low |
| 3 | 40th – 60th | Yellow | `#eab308` | Moderate |
| 4 | 60th – 80th | Orange | `#f97316` | High |
| 5 | 80th – 100th | Red | `#ef4444` | Very High |

**Calculation:**
1. For each station, take all historical weekly values
2. Compute the 20th, 40th, 60th, and 80th percentiles
3. Classify the most recent value into the appropriate bucket
4. For the national aggregate, apply the same logic to the national time series

### 7.2 Trend Arrow

Compares the most recent week's value to the value from **2 weeks prior** for the same station.

| Change | Arrow | Label |
|--------|-------|-------|
| Decrease > 10% | ↓ | Decreasing |
| Between -10% and +10% | → | Stable |
| Increase > 10% | ↑ | Increasing |

These thresholds align with SUM'Eau's own trend classification methodology.

### 7.3 Map Marker Design

Each marker on the map combines both indicators:
- **Circle** filled with the intensity color
- **Arrow icon** inside or next to the circle showing the trend direction
- Example: A red circle with ↑ = "Very High and rising" — strongest signal
- Example: A green circle with ↓ = "Very Low and decreasing" — weakest signal

### 7.4 Disclaimer

A visible disclaimer must appear near the severity indicators:

> "These levels represent relative viral circulation in wastewater compared to historical data. They indicate community-level virus presence, not individual infection risk. Wastewater surveillance complements but does not replace clinical data. Source: SUM'Eau, Santé publique France."

---

## 8. Page Layout & Responsive Design

### 8.1 Mobile (< 768px) — Primary Target

```
┌─────────────────────────┐
│  Header / App Name      │
├─────────────────────────┤
│  Severity Summary Card  │
│  (National level + trend│
│   as large icon/text)   │
├─────────────────────────┤
│  City Filter (dropdown) │
├─────────────────────────┤
│  Date Range Picker      │
├─────────────────────────┤
│  Time-Series Graph      │
│  (full width, ~300px h) │
├─────────────────────────┤
│  France Map             │
│  (full width, ~400px h) │
├─────────────────────────┤
│  Disclaimer             │
├─────────────────────────┤
│  Footer (data sources)  │
└─────────────────────────┘
```

### 8.2 Desktop (>= 1024px)

```
┌──────────────────────────────────────────────────┐
│  Header / App Name                               │
├──────────────────────────────────────────────────┤
│  Severity Summary Card (National)  │  Filters    │
│  (large icon + trend)              │  (city +    │
│                                    │   date)     │
├────────────────────────────────────┼─────────────┤
│  Time-Series Graph                 │  France Map │
│  (~60% width)                      │  (~40% w)   │
│                                    │             │
│                                    │             │
├──────────────────────────────────────────────────┤
│  Disclaimer + Footer                             │
└──────────────────────────────────────────────────┘
```

### 8.3 Tablet (768px – 1023px)

Same as mobile layout but with larger graph and map heights.

---

## 9. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| First Contentful Paint | < 1.5s |
| Largest Contentful Paint | < 2.5s |
| Lighthouse Performance | > 90 |
| Accessibility | WCAG 2.1 AA compliance |
| Browser support | Last 2 versions of Chrome, Firefox, Safari, Edge |
| Mobile breakpoint | 768px |
| Desktop breakpoint | 1024px |
| Data freshness | 6-hour cache revalidation |
| Max concurrent stations on graph | 5 + national |

---

## 10. User Preferences (localStorage)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `selectedStations` | `string[]` | `["national"]` | Station IDs currently selected |
| `dateRange` | `{from: string, to: string}` | Last 6 months | Custom date range |
| `theme` | `"light" \| "dark" \| "system"` | `"system"` | Color theme preference |

---

## 11. Future Considerations (Not in V1)

These are **not** part of the initial build but should be kept in mind for clean code architecture:

- **Multi-disease dashboard:** Adding other pathogens (influenza, RSV, etc.) from wastewater or other data sources
- **User authentication:** Saved preferences, alerts, custom dashboards
- **Push notifications:** Alert when a user's selected station crosses a severity threshold
- **Comparison mode:** Compare two stations side-by-side
- **Data export:** Download filtered data as CSV
- **Embed mode:** Allow other sites to embed the graph via iframe

---

## 12. Project Structure (Proposed)

```
src/
├── app/
│   ├── layout.tsx          # Root layout with metadata, fonts, theme
│   ├── page.tsx            # Main dashboard page
│   └── api/
│       └── trpc/           # tRPC API handler
├── server/
│   ├── trpc/
│   │   ├── router.ts       # Root tRPC router
│   │   └── routers/
│   │       └── wastewater.ts  # Wastewater data procedures
│   └── services/
│       └── sumeau.ts       # SUM'Eau data fetching & parsing
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── chart/
│   │   ├── wastewater-chart.tsx
│   │   └── chart-legend.tsx
│   ├── map/
│   │   ├── france-map.tsx
│   │   └── station-marker.tsx
│   ├── filters/
│   │   ├── station-select.tsx
│   │   └── date-range-picker.tsx
│   ├── severity/
│   │   ├── severity-badge.tsx
│   │   └── severity-summary.tsx
│   └── layout/
│       ├── header.tsx
│       └── footer.tsx
├── lib/
│   ├── utils.ts            # Utility functions
│   ├── severity.ts         # Percentile calculation & level classification
│   └── constants.ts        # Color codes, thresholds, config
├── types/
│   └── wastewater.ts       # TypeScript types for SUM'Eau data
└── hooks/
    ├── use-local-storage.ts
    └── use-station-preferences.ts
```

---

## 13. Open Questions

| # | Question | Impact |
|---|----------|--------|
| 1 | Are the Odissé API endpoints stable and CORS-friendly for client-side fallback, or must all fetching go through our tRPC server? | Data fetching architecture |
| 2 | Should dark mode be included in V1? (shadcn/ui supports it natively) | UI scope |
| 3 | The SUM'Eau dataset covers 54 stations. Some users may expect their city and not find it. Should we show a message explaining coverage limitations? | UX |
| 4 | Should the national line show weighted average (by population) or median? Both are useful but convey different information. | Data presentation |

---

## 14. Success Metrics

| Metric | Target |
|--------|--------|
| Page load time (mobile 4G) | < 3 seconds |
| Weekly active users (3 months post-launch) | 500+ |
| Lighthouse score (avg across categories) | > 85 |
| Data accuracy vs. source | 100% match with SUM'Eau published data |

---

## 15. References

- [SUM'Eau Dataset (data.gouv.fr)](https://www.data.gouv.fr/datasets/surveillance-du-sars-cov-2-dans-les-eaux-usees-sumeau)
- [SUM'Eau Indicators (Odissé)](https://odisse.santepubliquefrance.fr/explore/dataset/sum-eau-indicateurs/information)
- [SUM'Eau Stations (Odissé)](https://odisse.santepubliquefrance.fr/explore/dataset/sumeau_stations/information/)
- [Météo Covid App (data.gouv.fr reuse)](https://www.data.gouv.fr/en/reuses/application-meteo-covid-web-et-android/)
- [SUM'EAU Network Paper (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11857653/)
- [CDC Wastewater Activity Levels](https://www.cdc.gov/nwss/rv/COVID19-national-data.html)
- [OBÉPINE Dataset (data.gouv.fr)](https://www.data.gouv.fr/datasets/surveillance-du-sars-cov-2-dans-les-eaux-usees-1/)
