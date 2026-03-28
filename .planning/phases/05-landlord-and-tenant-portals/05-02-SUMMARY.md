---
phase: 05-landlord-and-tenant-portals
plan: 02
subsystem: ui
tags: [next.js, react, landlord-portal, queries, auth-guard, pdf-viewer]

# Dependency graph
requires:
  - phase: 03-role-foundation
    provides: requireRole auth guard, AuthUser types, agent delegation
  - phase: 05-01
    provides: landlord portal layout, PortalSidebar, route group structure
provides:
  - getLandlordProperties query at src/lib/queries/landlord.ts
  - getLandlordApplications query at src/lib/queries/landlord.ts
  - getLandlordApplication query at src/lib/queries/landlord.ts
  - getEffectiveContactId helper at src/lib/queries/landlord.ts
  - Landlord dashboard at src/app/(landlord)/landlord/dashboard/page.tsx
  - Landlord applications list at src/app/(landlord)/landlord/applications/page.tsx
  - Landlord application detail at src/app/(landlord)/landlord/applications/[id]/page.tsx
affects:
  - Landlord user experience: authenticated property and deal visibility

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Service client (bypasses RLS) used for landlord queries; auth enforced at application layer
    - Landlord-property relationship derived via lois.landlord_contact_id and leases.landlord_contact_id (no owner_contact_id column on properties)
    - Signed URL fetch pattern: GET /api/applications/[id]/documents/[docId]/view → { url } → PdfViewer modal
    - Client-side search filter with useMemo for landlord applications list

key-files:
  created:
    - src/lib/queries/landlord.ts
    - src/app/(landlord)/landlord/dashboard/page.tsx
    - src/app/(landlord)/landlord/applications/page.tsx
    - src/app/(landlord)/landlord/applications/applications-client.tsx
    - src/app/(landlord)/landlord/applications/[id]/page.tsx
    - src/app/(landlord)/landlord/applications/[id]/application-detail-client.tsx
  modified: []

key-decisions:
  - "No owner_contact_id on Property table — landlord-property relationship derived from lois.landlord_contact_id and leases.landlord_contact_id; property IDs collected from both tables and deduplicated"
  - "Service client used for all landlord queries to bypass RLS; access control enforced via requireRole() auth guard in each page server component"
  - "getLandlordApplication includes authorization check: verifies landlord has a LOI or lease on the application's property before returning data"

patterns-established:
  - "Landlord portal pages follow broker portal pattern: server component with requireRole + getEffectiveContactId, client component for interactivity"
  - "getEffectiveContactId(user) centralizes agent delegation: returns principalId ?? contactId, throws if neither present"

requirements-completed: [LAND-01, LAND-02, LAND-03, LAND-04]

# Metrics
duration: 4min
completed: 2026-03-28
---

# Phase 5 Plan 02: Landlord Portal Pages Summary

**Landlord portal with property dashboard, applications list, and application detail with signed-URL financial document viewing via PdfViewer modal, using service client queries filtered by landlord_contact_id from lois/leases tables**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-28T02:24:16Z
- **Completed:** 2026-03-28T02:28:16Z
- **Tasks:** 2
- **Files created:** 6

## Accomplishments

- Created `src/lib/queries/landlord.ts` with three query functions and one helper:
  - `getLandlordProperties`: collects property IDs from `lois` + `leases` via `landlord_contact_id`, fetches matching properties with units, enriches each with application/LOI/lease counts
  - `getLandlordApplications`: fetches all applications for landlord's properties with full relations (contact, property, unit, documents)
  - `getLandlordApplication`: fetches single application with authorization check — verifies landlord has LOI or lease on the application's property
  - `getEffectiveContactId`: helper returning `principalId ?? contactId` for agent delegation
- Created landlord dashboard showing property cards in a responsive grid with unit count and mini pipeline summary (applications, LOIs, leases); links to filtered applications view
- Created applications list with client-side search by business/contact/property name; responsive table with status badges and links to detail page
- Created application detail client with four card sections: Business Information, Contact Details, Property & Unit, Financial Documents; each document row has a View button that fetches signed URL and opens PdfViewer modal; read-only (no broker actions)

## Task Commits

1. **Task 1: Create landlord query functions** - `46d61a5` (feat)
2. **Task 2: Build landlord dashboard and application pages** - `cad44b2` (feat)

## Files Created

- `src/lib/queries/landlord.ts` - All landlord query functions; uses service client; derives property ownership via LOIs/leases; agent delegation via getEffectiveContactId
- `src/app/(landlord)/landlord/dashboard/page.tsx` - Server component; requireRole guard; getLandlordProperties; property card grid with pipeline counts; empty state
- `src/app/(landlord)/landlord/applications/page.tsx` - Server component; requireRole guard; getLandlordApplications; delegates to ApplicationsClient
- `src/app/(landlord)/landlord/applications/applications-client.tsx` - Client component; useMemo search filter; responsive table; Badge status; links to detail
- `src/app/(landlord)/landlord/applications/[id]/page.tsx` - Server component; requireRole guard; getLandlordApplication; notFound() if null
- `src/app/(landlord)/landlord/applications/[id]/application-detail-client.tsx` - Client component; Business/Contact/Property/Documents sections; signed URL fetch per document; PdfViewer modal; read-only

## Decisions Made

- `owner_contact_id` column doesn't exist on the `properties` table (plan assumed it would be there). Used `landlord_contact_id` on `lois` and `leases` tables instead to derive which properties belong to a landlord. Property IDs are collected from both tables and deduplicated with a Set.
- Service client (bypasses RLS) is the right approach here — there's no RLS policy on `applications` for landlord access. Auth is enforced at the page level via `requireRole()`.
- `getLandlordApplication` includes an explicit authorization step: after fetching the application, it verifies the landlord has a LOI or lease on that property before returning data (defense in depth).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Missing `owner_contact_id` on Property schema**
- **Found during:** Task 1
- **Issue:** The plan's query design referenced `properties.owner_contact_id` (filter landlord properties by contact), but this column does not exist in the `Property` interface or database schema. The properties table has no direct landlord relationship.
- **Fix:** Derived landlord-property relationship from `lois.landlord_contact_id` and `leases.landlord_contact_id` — collect distinct `property_id` values from both tables where `landlord_contact_id = contactId`, then fetch those properties. Same approach used for `getLandlordApplications` and `getLandlordApplication` authorization check.
- **Files modified:** `src/lib/queries/landlord.ts`
- **Commit:** 46d61a5

## Issues Encountered

None beyond the schema deviation above.

## User Setup Required

None — no external service configuration required. Landlord users must exist in the `users` table with `role = 'landlord'` and a valid `contact_id` that appears as `landlord_contact_id` in at least one LOI or lease.

## Next Phase Readiness

- Landlord portal is fully functional for authenticated users with existing deal history
- Phase 05-03 (tenant portal) can proceed independently — same patterns apply
- TypeScript compilation passes clean with no errors

## Self-Check: PASSED

All files created and commits present.
