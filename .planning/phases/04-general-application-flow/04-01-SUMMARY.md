---
phase: 04-general-application-flow
plan: "01"
subsystem: database, api
tags: [supabase, postgresql, rls, next-api, typescript]

# Dependency graph
requires:
  - phase: 03-role-foundation
    provides: requireAuthForApi(), service client, users table with auth_provider_id, is_broker_or_admin() RLS function
provides:
  - supabase/migrations/015_application_properties.sql — application_properties junction and application_drafts tables
  - GET /api/public/properties — active property list for multi-select form
  - GET /api/applications/drafts — load authenticated user's saved draft
  - PUT /api/applications/drafts — save/upsert authenticated user's draft
  - POST /api/applications — now populates application_properties junction table; accepts propertyIds[]
affects:
  - 04-general-application-flow (subsequent plans building the frontend form)
  - Any plan that queries application_properties or application_drafts

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Service client used for draft API to bypass potential RLS race window on initial insert
    - Non-fatal junction table insert pattern: log error but do not block response
    - Backward-compatible API extension: new propertyIds[] coexists with singular propertyId

key-files:
  created:
    - supabase/migrations/015_application_properties.sql
    - src/app/api/public/properties/route.ts
    - src/app/api/applications/drafts/route.ts
  modified:
    - src/types/database.ts
    - src/app/api/applications/route.ts

key-decisions:
  - "Service client (not user client) used for draft upsert to avoid RLS race on first insert"
  - "Draft validation: current_step validated 1-5 server-side before DB write"
  - "Non-fatal junction insert: application_properties failure is logged but never blocks the 201 response"
  - "portal_source set to portal_authenticated when userId is provided, qr_portal otherwise"
  - "application_drafts uses UNIQUE(user_id) — one draft per user, upsert on conflict"

patterns-established:
  - "Public API pattern: service client, no auth, filter by is_active, order by name"
  - "Draft save pattern: upsert with onConflict: user_id, return updated_at"
  - "Junction table pattern: bulk insert after application insert, non-fatal on error"

requirements-completed: [APP-02, APP-03]

# Metrics
duration: 3min
completed: 2026-03-28
---

# Phase 4 Plan 01: General Application Flow — Data Foundation Summary

**application_properties junction table, application_drafts server-side save, public properties list endpoint, and draft save/load API for multi-property general applications**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-28T02:00:26Z
- **Completed:** 2026-03-28T02:03:04Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Migration 015 defines application_properties (junction) and application_drafts (one-per-user) tables with full RLS policies and indexes
- Public GET /api/public/properties returns active properties ordered by name for the multi-select UI
- Authenticated GET/PUT /api/applications/drafts enables server-side save and resume of application form state
- POST /api/applications now populates the application_properties junction table for both multi-property portal submissions and legacy single-property QR-code flow

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration and update TypeScript types** - `3efeccd` (feat)
2. **Task 2: Create public properties list endpoint and draft save/load API** - `fb04a2b` (feat)
3. **Task 3: Extend applications POST to insert application_properties rows** - `366bca2` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `supabase/migrations/015_application_properties.sql` - Two new tables with RLS, indexes, updated_at trigger
- `src/types/database.ts` - ApplicationProperty and ApplicationDraft interfaces; both tables in Database type
- `src/app/api/public/properties/route.ts` - GET active properties list (no auth)
- `src/app/api/applications/drafts/route.ts` - GET/PUT draft save and load (requireAuthForApi)
- `src/app/api/applications/route.ts` - Added propertyIds[], userId, junction table insert logic

## Decisions Made
- Service client used for draft API to avoid any RLS race window during initial insert (same pattern as invitations)
- Draft step validation is server-side: current_step must be integer 1-5
- Junction insert failure is non-fatal — same pattern as email notification failure in the existing application route
- portal_source distinguishes portal_authenticated (with userId) from qr_portal (legacy flow)
- application_type is now derived from propertyIds[] presence: array with items → general, single propertyId → property, neither → general

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Migration 015 needs to be applied to Supabase when ready (manual `supabase db push` or dashboard SQL execution).

## Next Phase Readiness

Data foundation is complete. Phase 4 plans 02+ can now:
- Build the multi-step general application form UI that calls GET /api/public/properties for the property multi-select
- Wire draft auto-save to PUT /api/applications/drafts
- Submit to POST /api/applications with the propertyIds[] array

No blockers.

---
*Phase: 04-general-application-flow*
*Completed: 2026-03-28*
