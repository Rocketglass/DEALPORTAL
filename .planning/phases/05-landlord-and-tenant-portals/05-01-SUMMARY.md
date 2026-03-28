---
phase: 05-landlord-and-tenant-portals
plan: 01
subsystem: ui
tags: [next.js, react, sidebar, layout, auth-guard, portal]

# Dependency graph
requires:
  - phase: 03-role-foundation
    provides: requireRole auth guard, UserRole types, auth-guard.ts
  - phase: 04-general-application-flow
    provides: broker portal layout pattern to replicate
provides:
  - PortalSidebar component at src/components/layout/portal-sidebar.tsx
  - Landlord portal layout at src/app/(landlord)/landlord/layout.tsx
  - Tenant portal layout at src/app/(tenant)/tenant/layout.tsx
affects:
  - 05-02-landlord-portal-pages
  - 05-03-tenant-portal-pages

# Tech tracking
tech-stack:
  added: []
  patterns:
    - PortalSidebar accepts navItems + portalName props for role-aware reuse
    - Settings href derived from first navItem's portal prefix (no hardcoding)
    - requireRole() used in portal layouts to allow broker/admin cross-portal access

key-files:
  created:
    - src/components/layout/portal-sidebar.tsx
    - src/app/(landlord)/landlord/layout.tsx
    - src/app/(tenant)/tenant/layout.tsx
  modified: []

key-decisions:
  - "PortalSidebar derives settings href from first navItem prefix rather than accepting it as a prop — keeps the API minimal while still supporting arbitrary portals"
  - "Both portal layouts use requireRole() with broker/admin included — consistent with STATE.md decision that brokers can access all portals for support use cases"

patterns-established:
  - "Portal layout pattern: server component, requireRole(), PortalSidebar (desktop only), MobileNav + Header, main#main-content, skip-to-content link"
  - "PortalSidebar is the reusable sidebar for landlord/tenant portals; broker portal continues using the existing Sidebar component"

requirements-completed: [LAND-04, TNNT-01]

# Metrics
duration: 2min
completed: 2026-03-27
---

# Phase 5 Plan 01: Landlord and Tenant Portal Layout Infrastructure Summary

**Reusable PortalSidebar component and authenticated route group layouts for landlord and tenant portals, matching broker portal visual language with role-specific nav items and requireRole auth guards**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-27T08:38:41Z
- **Completed:** 2026-03-27T08:40:21Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created `PortalSidebar` — a fully reusable role-aware sidebar accepting `navItems[]` and `portalName` props, visually identical to the broker `Sidebar` (same 248px width, active pill indicator, font sizes, user info section, sign out handler)
- Created landlord portal layout (`(landlord)/landlord/layout.tsx`) with `requireRole('landlord', 'landlord_agent', 'broker', 'admin')` guard and landlord-specific nav items
- Created tenant portal layout (`(tenant)/tenant/layout.tsx`) with `requireRole('tenant', 'tenant_agent', 'broker', 'admin')` guard and tenant-specific nav items

## Task Commits

Each task was committed atomically:

1. **Task 1: Create PortalSidebar reusable role-aware sidebar component** - `a508ea4` (feat)
2. **Task 2: Create landlord and tenant portal layouts with auth guards** - `0327c2c` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `src/components/layout/portal-sidebar.tsx` - Reusable sidebar for landlord/tenant portals; accepts navItems + portalName; includes user info, settings link, sign out; 'use client'
- `src/app/(landlord)/landlord/layout.tsx` - Server component layout for landlord portal; requireRole guard; PortalSidebar + MobileNav + Header; force-dynamic
- `src/app/(tenant)/tenant/layout.tsx` - Server component layout for tenant portal; requireRole guard; PortalSidebar + MobileNav + Header; force-dynamic

## Decisions Made
- `PortalSidebar` derives the settings href dynamically from the first navItem's path prefix (e.g., `/landlord` from `/landlord/dashboard`) — keeps the component API minimal without requiring a separate `settingsHref` prop
- Broker/admin included in both portal `requireRole()` calls per the established project decision: brokers need cross-portal access for support

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Both route group directories exist: `src/app/(landlord)/landlord/` and `src/app/(tenant)/tenant/`
- Plans 05-02 (landlord pages) and 05-03 (tenant pages) can now add page files into these route groups and import `PortalSidebar` directly if needed for custom pages
- TypeScript compilation passes clean with no errors

## Self-Check: PASSED

All files created and commits verified present.

---
*Phase: 05-landlord-and-tenant-portals*
*Completed: 2026-03-27*
