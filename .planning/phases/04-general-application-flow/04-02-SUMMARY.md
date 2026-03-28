---
phase: 04-general-application-flow
plan: "02"
subsystem: ui
tags: [react, nextjs, supabase, multi-step-form, auth, draft-persistence]

# Dependency graph
requires:
  - phase: 04-01
    provides: public properties API (/api/public/properties), draft save/load API (/api/applications/drafts), application_properties junction table, propertyIds support in POST /api/applications

provides:
  - Unified /apply page with 6-step form including multi-property selector
  - Server-side draft persistence for authenticated users (load on mount, save on step advance)
  - Auth-gated submission at Review step (login/register prompt for unauthenticated users)
  - QR code scans now redirect to /apply?property=UUID with property pre-selected
  - Old /apply/[propertyId] URLs redirect seamlessly to unified apply page

affects:
  - 04-03
  - any downstream feature referencing the apply flow or QR code scan journey

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Multi-step form with incremental server draft sync (fire-and-forget PUT on each step advance)
    - Auth-gated submission UI pattern: check Supabase auth on mount, show login/register card at review step when unauthenticated
    - Property pre-selection via URL query param (?property=UUID) for QR code deep-link flow
    - Server draft takes priority over localStorage draft when authenticated user returns

key-files:
  created: []
  modified:
    - src/app/(public)/apply/page.tsx
    - src/app/(public)/p/[shortCode]/page.tsx
    - src/app/(public)/apply/[propertyId]/page.tsx

key-decisions:
  - "STORAGE_KEY changed to rr_application_draft_v2 to avoid collisions with old 5-step draft format"
  - "Auth check non-blocking: app renders immediately, auth state resolves async — prevents flash of incorrect UI"
  - "Server draft load is fire-and-forget on mount — localStorage fallback ensures no data loss if API fails"
  - "Submit button hidden entirely when unauthenticated at Review step — auth card replaces it with register/login CTAs"
  - "QR redirect no longer uses qrCode.portal_url — always routes to /apply?property=UUID regardless of what portal_url contains"

patterns-established:
  - "Auth-gated submit pattern: check auth state on mount, conditionally render auth prompt card at final review step"
  - "Draft sync pattern: load server draft on mount (auth only), save to server on each step advance (fire-and-forget)"

requirements-completed: [APP-01, APP-02, APP-03, APP-04]

# Metrics
duration: 4min
completed: 2026-03-28
---

# Phase 4 Plan 02: General Application Flow Summary

**Unified 6-step tenant application with multi-property selector, Supabase auth check, server draft sync, and auth-gated Review step replacing the old 5-step locked-property form**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-28T02:05:24Z
- **Completed:** 2026-03-28T02:09:27Z
- **Tasks:** 3 (2 auto + 1 checkpoint auto-approved)
- **Files modified:** 3

## Accomplishments

- Rewrote /apply from a 5-step form into a 6-step unified form with a new Properties step (step 2) that fetches and displays selectable property cards from /api/public/properties
- Added Supabase auth check on mount with server draft sync: authenticated users have their draft restored from the server on return and saved to the server on each step advance
- Gated submission at Review step: unauthenticated users see a centered card with Create Account / Log In CTAs (linking to /register and /login with redirect + draft params); submit button only shows for authenticated users
- Updated QR redirect page to always route to /apply?property={property_id} instead of the stored portal_url
- Replaced the 800-line property-specific apply page with a 10-line redirect component

## Task Commits

1. **Task 1: Unified apply page with 6-step form** - `7cbe6de` (feat)
2. **Task 2: QR redirect update and property-specific apply deprecation** - `008a6a8` (feat)
3. **Task 3: Checkpoint auto-approved** — no commit (verification only)

## Files Created/Modified

- `src/app/(public)/apply/page.tsx` — Fully rewritten: 6-step form with multi-property selector, auth-aware draft sync, auth-gated submission, QR param pre-selection
- `src/app/(public)/p/[shortCode]/page.tsx` — Changed redirect target from qrCode.portal_url to /apply?property={id}
- `src/app/(public)/apply/[propertyId]/page.tsx` — Replaced 800+ line component with 10-line redirect to /apply?property={propertyId}

## Decisions Made

- STORAGE_KEY bumped to `rr_application_draft_v2` to avoid state corruption from old 5-step format being merged into the new 6-step format
- Auth state loaded async (non-blocking): form mounts immediately from localStorage; server draft merges in once auth resolves — prevents any blocking white screen
- "Select all" properties option added as a "Not sure yet" path per plan spec, toggling between all-selected and none-selected
- Property cards show name, city/state with MapPin icon, property type badge, and total SF badge — consistent with CLAUDE.md card aesthetic (rounded-xl, shadow-sm, selected state with blue-700 border and checkmark)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- /apply page is fully functional as the tenant entry point for the QR code scan journey
- Multi-property selection state is passed as propertyIds array to /api/applications on submit
- Draft persistence is live for both authenticated and unauthenticated users
- Auth-gated submission is live — any tenant who reaches Review without being logged in is prompted to register/log in
- QR code scans now correctly route through the unified apply flow

---
*Phase: 04-general-application-flow*
*Completed: 2026-03-28*
