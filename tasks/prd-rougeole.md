# PRD: Rougeole (Measles) Data & Info Page

## Introduction

Add rougeole (measles) surveillance data from Santé Publique France's mandatory notification system to the dashboard. The data is annual (2005–2023), showing notification rates per 100,000 inhabitants by department. A new line chart section on the home page will display the yearly evolution. Additionally, a dedicated info page will explain all data sources used in the app (wastewater, clinical, and rougeole).

## Goals

- Fetch and store annual rougeole notification data from Odissé API
- Display a line chart showing rougeole notification rate evolution over years (2005–2023)
- Allow filtering by department (reuse existing department selector) with national as default
- Create a dedicated info page explaining all data sources and metrics used in the app
- Add navigation to the info page from the home page

## User Stories

### US-060: Fetch rougeole data from Odissé API

**Description:** As a developer, I need a service to fetch rougeole mandatory notification data from the Odissé API so it can be stored and displayed.

**Acceptance Criteria:**
- [ ] Create `src/server/services/rougeole.ts` that fetches from `https://odisse.santepubliquefrance.fr/api/explore/v2.1/catalog/datasets/rougeole-donnees-declaration-obligatoire/exports/json`
- [ ] Filter to `mdo_cl_age_rougeole = "Tous âges"` only (use `where` query param or post-fetch filter)
- [ ] Return typed array with fields: `annee` (year string), `dep` (department code), `libgeo` (department name), `tx` (notification rate per 100k), `rou` (case count)
- [ ] Handle fetch errors gracefully (return empty array or throw typed error)
- [ ] Typecheck passes

### US-061: Add rougeole table to database schema

**Description:** As a developer, I need a database table to store rougeole data so it persists and can be queried efficiently.

**Acceptance Criteria:**
- [ ] Add `rougeoleIndicatorsTable` to `src/server/db/schema.ts` with columns: `id` (serial PK), `year` (varchar), `department` (varchar, use `"national"` sentinel for aggregated national data), `notification_rate` (double precision), `cases` (integer)
- [ ] Add unique index on `(year, department)`
- [ ] Generate migration with `npm run db:generate`
- [ ] Typecheck passes

### US-062: Add rougeole sync service

**Description:** As a developer, I need a sync service to upsert rougeole data into the database, following the existing sync pattern.

**Acceptance Criteria:**
- [ ] Create `src/server/services/sync/rougeole-sync.ts` following the pattern from `wastewater-sync.ts` and `clinical-sync.ts`
- [ ] Batch upsert with `onConflictDoUpdate` on `(year, department)` unique key
- [ ] Compute national totals: sum `rou` (cases) across all departments per year, and compute weighted `tx` using total population
- [ ] Insert national data with `department = "national"` sentinel value
- [ ] Integrate into existing `/api/sync` route so rougeole syncs alongside wastewater and clinical data
- [ ] Add `rougeole_count` field to `syncMetadataTable` (or reuse existing error/count tracking)
- [ ] Typecheck passes

### US-063: Add tRPC router for rougeole data

**Description:** As a developer, I need a tRPC router to query rougeole data from the database so the frontend can display it.

**Acceptance Criteria:**
- [ ] Create `src/server/trpc/routers/rougeole.ts` with a `getIndicators` query
- [ ] Query accepts optional `department` param (defaults to `"national"`)
- [ ] Returns array of `{ year, notificationRate, cases }` sorted by year ascending
- [ ] Register router in root router (`src/server/trpc/router.ts`)
- [ ] Typecheck passes

### US-064: Rougeole line chart on home page

**Description:** As a user, I want to see the yearly evolution of rougeole notification rates so I can understand measles trends in France.

**Acceptance Criteria:**
- [ ] Create `src/components/rougeole-chart.tsx` using Recharts `LineChart`
- [ ] X-axis: years (2005–2023), Y-axis: notification rate per 100,000
- [ ] Single line showing `tx` values, with dots on each data point
- [ ] Tooltip shows year and exact rate value
- [ ] Loading skeleton while data fetches
- [ ] Add as a new section on the home page **below** the existing chart+map section
- [ ] Section has a heading like "Rougeole — Taux de notification (déclarations obligatoires)"
- [ ] Typecheck passes
- [ ] **Verify in browser using dev-browser skill**

### US-065: Department filtering for rougeole chart

**Description:** As a user, I want to filter the rougeole chart by department so I can see local measles trends.

**Acceptance Criteria:**
- [ ] Reuse the existing `DepartmentSelect` component (or the current department preference state)
- [ ] When a department is selected in the existing filter bar, the rougeole chart also updates to show that department's data
- [ ] When no department is selected (national), show national aggregate data
- [ ] Chart subtitle or label indicates which department/national is displayed
- [ ] Typecheck passes
- [ ] **Verify in browser using dev-browser skill**

### US-066: Data info/explanation page

**Description:** As a user, I want a dedicated page explaining all the data sources and metrics so I can understand what the dashboard shows.

**Acceptance Criteria:**
- [ ] Create page at `src/app/info/page.tsx` (route: `/info`)
- [ ] Page is server-rendered (no "use client" needed, static content)
- [ ] Sections explaining each data source:
  - **Eaux usées (wastewater):** What SUM'Eau is, what viral concentration means, data frequency (weekly), source link
  - **Passages aux urgences (clinical):** What Odissé/SurSaUD syndromic surveillance is, what ER visit rates mean, which diseases (grippe, bronchiolite, COVID-19), data frequency (weekly), source link
  - **Rougeole (measles):** What mandatory notifications (DO) are, what `tx` (taux de notification per 100k) means, data frequency (annual), coverage years (2005–2023), underreporting caveat (~56% completeness), source link
- [ ] Clean, readable layout using existing Card/prose styling
- [ ] French language throughout
- [ ] Typecheck passes
- [ ] **Verify in browser using dev-browser skill**

### US-067: Navigation to info page

**Description:** As a user, I want easy access to the info page from the home page so I can learn about the data.

**Acceptance Criteria:**
- [ ] Add a link/button on the home page that navigates to `/info` (e.g., a small "En savoir plus sur les données" link near the top or in the disclaimer area)
- [ ] Add an "Info" or "À propos des données" link in the header navigation
- [ ] Links use Next.js `Link` component for client-side navigation
- [ ] Typecheck passes
- [ ] **Verify in browser using dev-browser skill**

## Functional Requirements

- FR-1: Fetch rougeole data from Odissé API endpoint `rougeole-donnees-declaration-obligatoire`, filtering to "Tous âges" age group
- FR-2: Store rougeole indicators in a dedicated DB table with year, department, notification rate, and case count
- FR-3: Compute and store national aggregate (sum cases, weighted rate) with `department = "national"` sentinel
- FR-4: Sync rougeole data alongside existing wastewater and clinical sync in `/api/sync` cron
- FR-5: Expose rougeole data via tRPC query with optional department filter
- FR-6: Display a Recharts line chart of yearly notification rates on the home page
- FR-7: Rougeole chart reacts to the existing department selector
- FR-8: Dedicated `/info` page with explanations of all data sources in French
- FR-9: Navigation links to `/info` from header and home page

## Non-Goals

- No age group breakdown (only "Tous âges")
- No rougeole data on the France map (annual data doesn't fit the weekly map view)
- No rougeole severity classification (insufficient data points for meaningful quintiles)
- No region-level aggregation (department + national only)
- No weekly or monthly rougeole data (not available from the API)

## Technical Considerations

- The Odissé API is the same platform used for clinical data — reuse similar fetch patterns from `clinical.ts`
- The dataset has ~17,190 records total; filtering to "Tous âges" reduces to ~1,900 records — small enough to fetch in one call
- Use `where=mdo_cl_age_rougeole="Tous âges"` in the API query string to filter server-side
- National aggregate must be computed manually (sum cases, weighted average rate by population)
- The rougeole chart is simpler than the wastewater chart (single line, annual points) — a basic Recharts `LineChart` suffices
- Reuse existing color palette; pick a distinct color not used by wastewater/clinical lines (e.g., red/coral for measles)
- The info page is static content — can be a server component with no client-side state

## Design Considerations

- Rougeole section on home page should visually separate from the wastewater/clinical section above (use a Card or distinct heading)
- The line chart should be full-width (not split with map like the wastewater section)
- Info page should use a clean article-like layout with headings, paragraphs, and external source links
- Consider using shadcn Card components for each data source section on the info page

## Success Metrics

- Rougeole data fetches and displays correctly for all 19 years (2005–2023)
- Department filtering works correctly with existing selector
- Info page provides clear, accurate explanations of all data sources
- No regression to existing wastewater/clinical functionality

## Open Questions

- Should the rougeole chart also show case counts (`rou`) as a secondary metric, or only the rate (`tx`)?
- Should the info page include links back to the specific chart sections on the home page?
