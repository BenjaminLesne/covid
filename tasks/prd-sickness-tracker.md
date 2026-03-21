# PRD: Personal Sickness Tracker

## Introduction

Let users log when they're sick (date ranges) and see their illness episodes as vertical markers on the existing wastewater/clinical chart. This lets them visually correlate personal sickness with population-level disease trends. Requires email+password auth since data is stored server-side.

## Goals

- Add email/password authentication
- Let authenticated users log sickness episodes (start date → end date)
- Display personal sickness episodes as visual markers on the existing Recharts chart
- Keep sickness data private per user — only visible when logged in

## User Stories

### US-060: Auth — database schema & API

**Description:** As a developer, I need user accounts and sessions stored in the DB so users can register and log in.

**Acceptance Criteria:**

- [ ] Add `usersTable` to schema: id, email (unique), password_hash, created_at
- [ ] Add `sessionsTable` to schema: id, user_id (FK), token (unique), expires_at
- [ ] Password hashed with bcrypt (use `bcryptjs` — pure JS, no native deps)
- [ ] Add tRPC `auth` router with `register`, `login`, `logout`, `me` procedures
- [ ] `register` validates email format, enforces min 8-char password, returns session token
- [ ] `login` verifies credentials, returns session token
- [ ] `logout` deletes session
- [ ] `me` returns current user (email, id) or null
- [ ] Session token sent via HTTP-only cookie
- [ ] Typecheck/lint passes

### US-061: Auth — UI (register/login/logout)

**Description:** As a user, I want to create an account and log in so my sickness data is saved.

**Acceptance Criteria:**

- [ ] Login/Register form accessible from header (e.g., "Connexion" button)
- [ ] Form toggles between login and register modes
- [ ] Shows validation errors inline (bad email, short password, wrong credentials)
- [ ] On success: form closes, header shows user email + logout button
- [ ] On logout: header reverts to "Connexion" button
- [ ] Session persists across page reloads (cookie-based)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-062: Sickness episodes — database schema & API

**Description:** As a developer, I need to store sickness episodes per user.

**Acceptance Criteria:**

- [ ] Add `sicknessEpisodesTable` to schema: id, user_id (FK), start_date (date), end_date (date), created_at
- [ ] Add tRPC `sickness` router with `list`, `create`, `delete` procedures
- [ ] All procedures require authenticated user (middleware checks session cookie)
- [ ] `list` returns only current user's episodes, sorted by start_date desc
- [ ] `create` validates start_date ≤ end_date, no overlapping episodes
- [ ] `delete` only allows deleting own episodes
- [ ] Typecheck/lint passes

### US-063: Sickness logging UI

**Description:** As a user, I want to log when I was sick so I can track my illness history.

**Acceptance Criteria:**

- [ ] "Ajouter un épisode" button visible only when logged in (near chart or in a side panel)
- [ ] Opens a form/dialog with two date pickers: start date, end date
- [ ] End date defaults to start date (single-day illness shortcut)
- [ ] Submitted episodes appear in a small list below the button with delete option
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-064: Display sickness markers on chart

**Description:** As a user, I want to see my sickness episodes as visual markers on the chart so I can correlate with disease trends.

**Acceptance Criteria:**

- [ ] Each sickness episode renders as a shaded vertical band (ReferenceArea) on the Recharts chart
- [ ] Band uses a distinct color (e.g., semi-transparent red/orange) with a legend entry ("Mes épisodes")
- [ ] Markers only appear when user is logged in and has episodes in the visible date range
- [ ] Markers update when date range filter changes
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-065: Personal sickness frequency stats

**Description:** As a user, I want to see basic stats about how often I get sick.

**Acceptance Criteria:**

- [ ] Small stats section visible when logged in (below episode list or in the same panel)
- [ ] Shows: total episodes count, average episodes per year, average duration, last episode date
- [ ] Stats computed from all user episodes (not filtered by current date range)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: Users register with email + password (hashed with bcryptjs)
- FR-2: Sessions managed via HTTP-only cookies with expiration (30 days)
- FR-3: All sickness endpoints require authentication (tRPC middleware)
- FR-4: Sickness episodes stored as date ranges (start_date, end_date)
- FR-5: Episodes rendered as Recharts `ReferenceArea` components on the existing chart
- FR-6: All UI text in French (Connexion, Déconnexion, Ajouter un épisode, etc.)
- FR-7: Auth state available app-wide via React context or tRPC query

## Non-Goals

- No OAuth / social login
- No password reset flow (can be added later)
- No symptom categorization (just date ranges)
- No statistical correlation computation — visual only
- No sharing sickness data with other users
- No email verification

## Technical Considerations

- **Auth:** Custom lightweight auth via tRPC + bcryptjs + HTTP-only cookies. No heavy auth library needed for this scope.
- **DB:** Add tables via Drizzle schema + migration. Follows existing pattern in `src/server/db/schema.ts`.
- **Chart:** Use Recharts `<ReferenceArea>` for vertical bands — already available in the Recharts dependency.
- **Middleware:** Create a tRPC `protectedProcedure` that reads session cookie and attaches user to context.
- **Cookie handling:** Use Next.js `cookies()` API in tRPC context creation.

## Success Metrics

- User can register, log in, add a sickness episode, and see it on the chart in under 2 minutes
- Sickness markers clearly visible against existing chart elements
- No performance regression on chart rendering

## Open Questions

- Should we add a password reset flow in a follow-up?
- Max number of episodes per user? (probably not needed for personal use)
