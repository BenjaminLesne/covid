# PRD: Generic Events System

## Introduction

Replace the single-purpose `sickness_episodes` table with a generic `events` table supporting categories (sick, gym, social, travel, etc.). Events are displayed as vertical markers/bands on the wastewater chart so users can visually correlate life events with getting sick.

## Goals

- Unify sickness episodes and other life events into a single `events` entity
- Display all event categories on the chart with distinct colors
- Enable users to visually spot correlations between events and sickness
- Migrate existing `sickness_episodes` data to the new `events` table
- Full CRUD for events with category support

## User Stories

### US-070: Create events table and migrate sickness data

**Description:** As a developer, I need a generic events table so all event types share one schema.

**Acceptance Criteria:**

- [ ] New `events` table with columns: `id`, `user_id`, `category` (varchar), `name` (varchar, nullable), `date` (date), `end_date` (date, nullable — used for multi-day events like sickness), `created_at`
- [ ] Default categories defined as a shared constant: `sick`, `gym`, `social`, `travel`, `other`
- [ ] Each category has an assigned color and label (French)
- [ ] SQL migration that copies `sickness_episodes` rows into `events` with `category = 'sick'`, mapping `start_date` → `date`, `end_date` → `end_date`
- [ ] Drop `sickness_episodes` table after migration
- [ ] Typecheck/lint passes

### US-071: Events tRPC router (CRUD)

**Description:** As a user, I want to create, list, update, and delete events so I can track my life events.

**Acceptance Criteria:**

- [ ] New `events` tRPC router replacing `sickness` router
- [ ] `list` — returns all events for the logged-in user, ordered by date desc
- [ ] `create` — accepts `{ category, name?, date, endDate? }`, validates category is in allowed list
- [ ] `update` — accepts `{ id, category, name?, date, endDate? }`, ownership check
- [ ] `delete` — accepts `{ id }`, ownership check
- [ ] Root router updated: remove `sickness`, add `events`
- [ ] Typecheck passes

### US-072: Events panel UI (replaces SicknessPanel)

**Description:** As a user, I want a panel to manage all my events with category selection.

**Acceptance Criteria:**

- [ ] New `EventsPanel` component replaces `SicknessPanel`, titled "Mes événements"
- [ ] "Add event" form includes: category selector (dropdown/select), optional name field, date picker, optional end date picker
- [ ] Optional end date for any event (multi-day). All categories behave the same.
- [ ] Event list grouped or tagged by category with colored badge
- [ ] Edit and delete actions preserved
- [ ] Time Machine button preserved for all events
- [ ] Stats section shows for `sick` events (preserve existing SicknessStats behavior)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-073: Display events on chart

**Description:** As a user, I want to see all my events on the wastewater chart so I can visually correlate them with sickness.

**Acceptance Criteria:**

- [ ] Events with `end_date`: displayed as `ReferenceArea` bands in their category color
- [ ] Single-day events: displayed as `ReferenceLine` vertical markers in their category color
- [ ] Legend entries: one per category that has events in the visible range, grouped under "Personnel"
- [ ] Each category can be toggled on/off via the legend (extend `hiddenKeys`)
- [ ] Tooltip or label on hover showing event name (if set) and category
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-074: Update chart-utils for event colors

**Description:** As a developer, I need a shared mapping of event categories to colors/labels so the chart and UI stay consistent.

**Acceptance Criteria:**

- [ ] Shared `EVENT_CATEGORIES` constant exported from a utility file (e.g. `src/lib/event-categories.ts`)
- [ ] Each category: `{ key, label (French), color (CSS rgb) }`
- [ ] `sick` → red (`rgb(239, 68, 68)`)
- [ ] `gym` → blue (`rgb(59, 130, 246)`)
- [ ] `social` → purple (`rgb(168, 85, 247)`)
- [ ] `travel` → amber (`rgb(245, 158, 11)`)
- [ ] `other` → gray (`rgb(156, 163, 175)`)
- [ ] Typecheck passes

## Functional Requirements

- FR-1: New `events` table replaces `sickness_episodes` with fields: `id`, `user_id`, `category`, `name`, `date`, `end_date`, `created_at`
- FR-2: `category` is a varchar validated against an allowed list at the tRPC layer (not a DB enum, for easy extensibility)
- FR-3: Migration script copies existing sickness data to events table
- FR-4: Events displayed on chart — multi-day as bands, single-day as vertical lines (regardless of category)
- FR-5: Each category has a distinct color visible in both chart and UI
- FR-6: All events are per-user, scoped by `user_id` (same auth as current sickness)
- FR-7: The `name` field is optional — allows distinguishing events within a category (e.g. "Salle de sport" vs "Crossfit")

## Non-Goals

- No automatic correlation analysis or stats (beyond existing sickness stats) — users eyeball it
- No recurring events
- No import/export
- No shared/public events
- No notification or reminder system

## Technical Considerations

- Reuse existing auth/protectedProcedure from tRPC init
- Chart rendering: extend existing `wastewater-chart.tsx` logic that already handles sickness bands
- `ReferenceArea` for sick (multi-day), `ReferenceLine` for single-day events
- Category list is a TypeScript constant, not a DB table — keeps it simple
- Migration order: create `events` table → copy data → drop `sickness_episodes` → update code

## Design Considerations

- Category selector: use shadcn `Select` component with colored dot indicator
- Event list: show colored badge per category (like the legend)
- Keep the panel compact — events list can grow, consider max-height with scroll

## Success Metrics

- User can log events and see them on the chart alongside sickness bands
- Visual correlation is possible at a glance (e.g. gym markers consistently appearing before sick bands)
- No regression in existing sickness tracking functionality

## Open Questions

None.
