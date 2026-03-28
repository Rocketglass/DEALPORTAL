---
phase: 07-lease-negotiation-and-notifications
plan: "01"
subsystem: lease-negotiation
tags: [authentication, notifications, email, in-app, multi-party]
one_liner: "Authenticated multi-party lease negotiation endpoints with email and in-app notifications replicating the Phase 6 LOI pattern"

dependency_graph:
  requires:
    - src/lib/security/auth-guard.ts (requireAuthForApi)
    - src/lib/supabase/service.ts (createServiceClient)
    - src/lib/email/notifications.ts (notifyLoiSectionUpdate pattern)
    - src/lib/email/templates.ts (loiSectionUpdate pattern)
  provides:
    - Authenticated GET /api/leases/[id]/negotiate endpoint
    - Authenticated POST /api/leases/[id]/negotiate/respond endpoint
    - notifyLeaseTermUpdate function
    - leaseTermUpdate email template
  affects:
    - Lease negotiation UI (callerRole, landlordContactId, tenantContactId, brokerContactId now in response)

tech_stack:
  added: []
  patterns:
    - requireAuthForApi() throws pattern for API routes (returns JSON 401 not redirect)
    - Service client bypasses RLS; auth enforced at application layer
    - Fire-and-forget async IIFE for email and in-app notifications
    - Optimistic locking via updatedAt field with 409 on concurrent modification
    - as any casts for Supabase typed client on non-typed tables

key_files:
  created: []
  modified:
    - src/app/api/leases/[id]/negotiate/route.ts
    - src/app/api/leases/[id]/negotiate/respond/route.ts
    - src/lib/email/notifications.ts
    - src/lib/email/templates.ts

decisions:
  - "Remove negotiation_status gate from GET endpoint — authenticated parties can see all their leases regardless of status (respond endpoint still gates non-negotiation leases)"
  - "party_role derived from user.role, not from request body — eliminates spoofing vector from public endpoint"
  - "Optimistic locking added to respond endpoint matching LOI respond pattern for concurrent modification safety"

metrics:
  duration: "3 min"
  completed_date: "2026-03-28"
  tasks_completed: 2
  files_modified: 4
---

# Phase 7 Plan 01: Lease Negotiation Authentication and Notifications Summary

## What Was Built

Converted the lease negotiate GET and respond POST endpoints from public to authenticated multi-party, following the exact pattern established in Phase 6 for LOI endpoints.

**Lease negotiate GET (`/api/leases/[id]/negotiate`):**
- Replaced inline `getServiceClient()` with `requireAuthForApi()` + `createServiceClient()`
- Returns 401 for unauthenticated requests, 403 for non-party users
- Broker/admin bypass: full access to any lease
- Landlord check: `effectiveContactId === lease.landlord_contact_id`
- Tenant check: `effectiveContactId === lease.tenant_contact_id`
- Response now includes `callerRole`, `landlordContactId`, `tenantContactId`, `brokerContactId`
- Removed `negotiation_status` gate — authenticated parties can view all their leases

**Lease respond POST (`/api/leases/[id]/negotiate/respond`):**
- Full rewrite mirroring `src/app/api/lois/[id]/respond/route.ts` structure
- `partyRole` removed from request body; `created_by` and `party_role` derived from `user.role`
- Optimistic locking: `updatedAt` field triggers 409 if section modified concurrently
- Fire-and-forget email notifications to two non-actor parties via `notifyLeaseTermUpdate`
- Fire-and-forget in-app notification rows with `type: 'lease_term_update'`
- Audit log records authenticated `user.id` instead of `null`

**Email template (`leaseTermUpdate` in templates.ts):**
- Mirrors `loiSectionUpdate` template structure exactly
- Subject: `Lease Update: {propertyAddress} — {actorRoleLabel} responded`
- CTA links to `/leases/{leaseId}` in portal

**Notification function (`notifyLeaseTermUpdate` in notifications.ts):**
- Mirrors `notifyLoiSectionUpdate` signature exactly
- Sends to `recipients` array (two non-actor parties)

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 840e973 | feat(07-01): authenticate lease negotiate GET endpoint with multi-party access |
| Task 2 | 26027aa | feat(07-01): authenticate lease respond endpoint with role attribution and notifications |

## Self-Check: PASSED

All files found. All commits verified.
