# PRD: Dashboard Error Handling

## Problem
When API calls fail (network errors, external API downtime, timeouts), the dashboard shows loading skeletons forever. Users on mobile or with unreliable connections see an infinite loading state with no feedback about what went wrong and no way to recover.

## Goal
Replace infinite loading states with clear error messages and retry actions so users always know what's happening.

## User Stories

### US-101: Wastewater chart error state
**As a** user viewing the dashboard
**I want** to see an error message when the wastewater chart data fails to load
**So that** I know the data is unavailable and can retry

**Acceptance Criteria:**
- When `getStations` or `getIndicators` tRPC queries error, display an error card instead of infinite skeleton
- Error card shows a French message: "Impossible de charger les données. Veuillez réessayer."
- Error card includes a "Réessayer" (retry) button that refetches the failed queries
- Error card matches the chart container dimensions (h-[300px] on mobile, sm:h-[400px], md:h-[450px])
- Verify on mobile (375×812) that the error state displays correctly using the dev-browser CLI

### US-102: Severity summary error state
**As a** user viewing the dashboard
**I want** to see an error message when the national trend data fails to load
**So that** I'm not stuck looking at skeleton placeholders forever

**Acceptance Criteria:**
- When `getNationalTrend` tRPC query errors, display an error message inside the Card instead of infinite skeleton
- Show French message: "Données non disponibles — erreur de chargement"
- Include a "Réessayer" button that refetches
- Card layout remains consistent (same CardHeader/CardContent structure)
- Verify on mobile (375×812) using dev-browser CLI

### US-103: France map error state
**As a** user viewing the dashboard
**I want** to see an error message when the map data fails to load
**So that** I understand why the map isn't showing

**Acceptance Criteria:**
- When `getStations` query errors inside FranceMapInner, display an error state instead of a broken/empty map
- Show French message: "Impossible de charger la carte. Veuillez réessayer."
- Include a "Réessayer" button
- Error container matches map dimensions (h-[400px] on mobile, md:h-[450px], lg:h-[500px])
- Verify on mobile (375×812) using dev-browser CLI

## Technical Notes
- Use tRPC's `isError` and `error` from `useQuery` return values alongside `isLoading`
- Use React Query's `refetch()` for retry buttons
- Create a small reusable `QueryError` component to avoid duplicating error UI
- Keep error styling consistent: rounded border, muted colors, centered content with icon
