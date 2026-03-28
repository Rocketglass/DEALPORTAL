---
phase: 05-landlord-and-tenant-portals
plan: 03
subsystem: tenant-portal
tags: [tenant, dashboard, loi, lease, deal-pipeline, authenticated]
dependency_graph:
  requires: [05-01]
  provides: [tenant-dashboard, tenant-query-layer]
  affects: [tenant-portal-layout]
tech_stack:
  added: []
  patterns: [batch-fetch-avoid-n+1, agent-delegation-via-principalId, loi-section-progress-bar]
key_files:
  created:
    - src/lib/queries/tenant.ts
    - src/app/(tenant)/tenant/dashboard/page.tsx
    - src/app/(tenant)/tenant/dashboard/dashboard-client.tsx
  modified: []
key_decisions:
  - Lease-to-application join goes via LOI (leases.loi_id), not direct application_id — matches DB schema
  - Supabase returns related rows as arrays even for foreign-key single joins; handled with Array.isArray guard
  - Pre-existing TypeScript errors in landlord.ts (from prior plan) are out of scope and deferred
metrics:
  duration: "3 min"
  completed_date: "2026-03-27"
  tasks_completed: 2
  files_created: 3
  files_modified: 0
---

# Phase 5 Plan 3: Tenant Portal Dashboard Summary

**One-liner:** Authenticated tenant dashboard with full deal pipeline — application status steppers, LOI section-level progress bar (accepted/countered/proposed), and lease/DocuSign signing progress.

## What Was Built

### Task 1: Tenant Query Function (`src/lib/queries/tenant.ts`)

`getTenantApplications(contactId)` fetches all applications for a tenant contact with associated LOI and lease data:

- Applications filtered by `contact_id` with property and unit joins
- Batch-fetches LOIs by application IDs (with `loi_sections` for section-level status)
- Batch-fetches leases by LOI IDs (leases link to LOIs, not applications directly)
- Returns `TenantApplicationWithDeal[]` — clean shape with `loi.sections[]` for progress bar
- Agent delegation: caller passes `user.principalId ?? user.contactId`
- `{ data, error }` return pattern consistent with all other query modules

### Task 2: Tenant Dashboard (`src/app/(tenant)/tenant/dashboard/`)

**Server page** (`page.tsx`):
- `requireRole('tenant', 'tenant_agent', 'broker', 'admin')` — includes broker for cross-portal support
- Computes `contactId = user.principalId ?? user.contactId`
- Empty state if no contactId (account not linked to contact record)
- Calls `getTenantApplications` and passes data to client

**Client component** (`dashboard-client.tsx`):
- Application cards: business name, property/suite, submitted date, status badge
- `ProgressStepper` (submitted → under review → decision) — copied and adapted from public status page pattern
- Deal pipeline section (shown only for approved applications with LOI or lease):
  - LOI status row: icon + label + sent/agreed dates
  - `LoiSectionProgress` component: horizontal bar with color-coded segments (green=accepted, amber=countered, red=rejected, gray=proposed) + "X of Y sections agreed" label
  - Lease status row: icon + label + DocuSign status during signing phase + signed date
  - Grayed-out "Lease — Pending LOI agreement" placeholder when applicable
- Info requested banner (orange) and approved banner (green) matching public status page
- Empty state with `FileText` icon and link to `/apply`

## Deviations from Plan

### Pre-existing Issue (Deferred — Out of Scope)

**`src/lib/queries/landlord.ts` TypeScript errors (11 errors)**
- Found during: Final verification
- Issue: `property_id` and `id` not found on type `never` in landlord.ts — pre-existing errors from prior plan execution, not introduced by this plan
- Action: Logged as deferred per scope boundary rules. Not introduced by this plan's changes.
- The three files created in this plan compile without errors when checked directly.

## Self-Check

**Files created:**
- [x] `src/lib/queries/tenant.ts` — FOUND
- [x] `src/app/(tenant)/tenant/dashboard/page.tsx` — FOUND
- [x] `src/app/(tenant)/tenant/dashboard/dashboard-client.tsx` — FOUND

**Commits:**
- [x] `8b6bca9` — feat(05-03): create getTenantApplications query function
- [x] `d60bb65` — feat(05-03): build tenant dashboard with deal pipeline visualization

## Self-Check: PASSED
