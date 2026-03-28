---
phase: 06-in-portal-loi-negotiation
plan: 02
subsystem: ui
tags: [react, nextjs, loi, negotiation, landlord, tenant, portal]

# Dependency graph
requires:
  - phase: 06-01
    provides: Authenticated /api/lois/[id]/review-data and /api/lois/[id]/respond endpoints with multi-party support
provides:
  - Shared LoiNegotiationView component (src/components/loi/loi-negotiation-view.tsx) used by all 3 portals
  - Landlord LOI detail page at /landlord/lois/[id] with requireRole guard
  - Tenant LOI detail page at /tenant/lois/[id] with requireRole guard
  - LOIs nav item in landlord portal sidebar (FileSignature icon)
  - LOIs nav item in tenant portal sidebar (FileSignature icon)
affects:
  - 06-03 (any downstream LOI phase building on portal views)
  - Broker portal (unmodified, but broker view provides visual reference baseline)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Per-section submit (not batch) for multi-party negotiation — each party submits one section at a time and UI refetches
    - Shared client component serves all 3 portals via props (loiId, callerRole, portalBasePath)
    - SectionCard sub-component with local historyOpen state, parent holds submission state
    - useCallback for loadData enables refetch after submit without infinite loop

key-files:
  created:
    - src/components/loi/loi-negotiation-view.tsx
    - src/app/(landlord)/landlord/lois/[id]/page.tsx
    - src/app/(tenant)/tenant/lois/[id]/page.tsx
  modified:
    - src/app/(landlord)/landlord/layout.tsx
    - src/app/(tenant)/tenant/layout.tsx

key-decisions:
  - "Per-section submit instead of batch: multi-party negotiation benefits from granular section-by-section responses; UI refetches after each submit so all parties see live state"
  - "Shared LoiNegotiationView component with callerRole prop: avoids three separate components while still allowing role-specific rendering if needed"
  - "Three-party timeline colors: broker=blue (#1e40af), landlord=amber-500, tenant=emerald-500 — extends existing two-party pattern from LoiSectionsPanel"
  - "Action buttons only shown for sections with status != 'accepted' — accepted sections show final agreed value, not new action buttons"

patterns-established:
  - "Shared negotiation component pattern: one 'use client' component, props for loiId/callerRole/portalBasePath, consumes authenticated API"
  - "Per-section submit with refetch: POST to respond endpoint with single section, then call loadData() to refresh all section states"
  - "Three-party role detection from created_by string: tenant/lessee keyword check added alongside existing broker/landlord checks"

requirements-completed: [LOI-01, LOI-02, LOI-03, LOI-05]

# Metrics
duration: 3min
completed: 2026-03-28
---

# Phase 06 Plan 02: In-Portal LOI Negotiation Views Summary

**Shared LoiNegotiationView component wired into landlord and tenant portals with per-section accept/counter/reject, three-party timeline attribution, and nav updates**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-28T02:46:29Z
- **Completed:** 2026-03-28T02:49:32Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created `LoiNegotiationView` client component combining broker panel visuals with public review page action pattern — serves all 3 portals identically
- Landlord can navigate to `/landlord/lois/[id]` and negotiate sections; tenant to `/tenant/lois/[id]` — both auth-guarded
- Extended timeline to three-party attribution (broker=blue, landlord=amber, tenant=emerald) with a visible party legend
- Both portal sidebars now include a "LOIs" navigation link with the FileSignature icon

## Task Commits

1. **Task 1: Create shared LoiNegotiationView component** - `270c303` (feat)
2. **Task 2: Landlord/tenant LOI pages and portal nav updates** - `d4cc4e0` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `src/components/loi/loi-negotiation-view.tsx` — Shared LOI negotiation component; fetches review-data, renders section cards with action buttons, timeline, progress sidebar
- `src/app/(landlord)/landlord/lois/[id]/page.tsx` — Landlord LOI detail page; requireRole guard, renders LoiNegotiationView
- `src/app/(tenant)/tenant/lois/[id]/page.tsx` — Tenant LOI detail page; requireRole guard, renders LoiNegotiationView
- `src/app/(landlord)/landlord/layout.tsx` — Added LOIs nav item (FileSignature icon) after Applications
- `src/app/(tenant)/tenant/layout.tsx` — Added LOIs nav item (FileSignature icon)

## Decisions Made

- **Per-section submit instead of batch:** Multi-party negotiation benefits from granular responses — each party responds to one section at a time, then the UI refetches to show updated status. This prevents conflicts where parties simultaneously respond to the same section.
- **Shared component with callerRole prop:** All three portals render the same `LoiNegotiationView` — role-specific behavior can be added via the `callerRole` prop if future plans require it.
- **Action buttons hidden for accepted sections:** Sections with `status === 'accepted'` show the agreed value but no action buttons — there's nothing left to negotiate on an accepted section.
- **`useCallback` for loadData:** Required to allow the effect dep array to include `loadData` without infinite loop when refetching after each submit.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All three portals (broker, landlord, tenant) can now view and negotiate LOI sections
- Broker's existing `/lois/[id]` page is unchanged and continues to work
- LOI list pages (`/landlord/lois` and `/tenant/lois`) don't exist yet — nav items link to them, but landlords/tenants navigate to specific LOIs from their dashboards (noted in plan as acceptable)
- If a future plan adds LOI list pages, the nav items are already in place

---
*Phase: 06-in-portal-loi-negotiation*
*Completed: 2026-03-28*
