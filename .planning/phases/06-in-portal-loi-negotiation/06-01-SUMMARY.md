---
phase: 06-in-portal-loi-negotiation
plan: "01"
subsystem: loi-negotiation-api
tags: [authentication, multi-party, notifications, loi, api-routes]
dependency_graph:
  requires: [src/lib/security/auth-guard.ts, src/lib/supabase/service.ts, src/lib/supabase/server.ts]
  provides: [authenticated-review-data-endpoint, multi-party-respond-endpoint, notifyLoiSectionUpdate]
  affects: [src/app/api/lois/[id]/review-data/route.ts, src/app/api/lois/[id]/respond/route.ts, src/lib/email/notifications.ts, src/lib/email/templates.ts]
tech_stack:
  added: []
  patterns: [requireAuthForApi for API route auth, as-any casts for Supabase typed client FK join inference]
key_files:
  created: []
  modified:
    - src/app/api/lois/[id]/review-data/route.ts
    - src/app/api/lois/[id]/respond/route.ts
    - src/lib/email/notifications.ts
    - src/lib/email/templates.ts
decisions:
  - "Used requireAuthForApi() (throws) rather than requireAuth() (redirects) — API routes must return JSON 401, not redirect"
  - "Service client (createServiceClient) used for all DB operations; auth enforced at application layer above"
  - "Supabase typed client returns never for FK join partial selects — used as any casts on update/insert/select calls per established project pattern"
  - "In-app notification lookup failure is non-fatal — if contact has no user row yet, skip that notification without blocking the response"
  - "Broker/admin always have party access — no contact_id check needed for broker or admin roles"
metrics:
  duration: "6 min"
  completed_date: "2026-03-27"
  tasks_completed: 2
  files_modified: 4
---

# Phase 06 Plan 01: Multi-Party LOI Negotiation API Summary

**One-liner:** Converted LOI review-data and respond endpoints from public to authenticated multi-party with role attribution in negotiations and notifications to the two non-actor parties via email and in-app rows.

## What Was Built

### Task 1: Authenticated review-data endpoint

`GET /api/lois/[id]/review-data` was a public endpoint returning minimal section data. It is now:

- **Authenticated** — returns 401 without a valid session (uses `requireAuthForApi()`)
- **Authorized** — returns 403 if the caller is not a party to the LOI (broker/admin bypass; landlord/tenant check by `contact_id` or `principal_id`)
- **Enriched** — returns `callerRole`, `landlordContactId`, `tenantContactId`, `brokerContactId` in meta so the UI knows which party is viewing
- **History-aware** — returns full `negotiations` array per section (ordered ascending by `created_at`) including `createdBy` attribution
- **Status-complete** — returns `status`, `landlordResponse`, `agreedValue`, and `updatedAt` per section for optimistic locking
- **Status-gate removed** — authenticated parties can see all LOIs regardless of status (the respond endpoint still gates non-active LOIs)

### Task 2: Multi-party respond endpoint + notifications

`POST /api/lois/[id]/respond` was a public endpoint that hardcoded `created_by: 'landlord'` and only notified the broker. It is now:

**Authentication & authorization:**
- Returns 401 without session, 403 for non-parties (same party check as review-data)
- Preserves existing 400/409/410 validation, optimistic locking, and expiration checks

**Role attribution:**
- `created_by` in `loi_negotiations` inserts = `user.role` (e.g., `'broker'`, `'landlord'`, `'tenant'`, `'tenant_agent'`)
- `last_updated_by` in `loi_sections` updates = `user.role`

**Multi-party email notifications (fire-and-forget):**
- If LOI fully agreed: `notifyLoiAgreed()` to all 3 parties (unchanged behavior)
- Otherwise: new `notifyLoiSectionUpdate()` sends to the TWO non-actor parties only
  - Landlord responds → broker + tenant notified
  - Tenant responds → broker + landlord notified
  - Broker responds → landlord + tenant notified

**In-app notification rows (fire-and-forget):**
- After email notification block, looks up `user_id` from `users` table by `contact_id` for each non-actor party
- Inserts `notifications` rows with `type: 'loi_section_update'`, role-appropriate `link_url`:
  - `/lois/{id}` for broker
  - `/landlord/lois/{id}` for landlord
  - `/tenant/lois/{id}` for tenant
- Non-fatal: if contact has no user row, skips silently

**New email template (`loiSectionUpdate`):**
- Subject: `LOI Update: {propertyAddress} — {actorRole} responded`
- Body: shows actor name, role, section count, property details, and CTA button

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - TypeScript] Supabase typed client returns `never` for partial FK join selects and update payloads**
- **Found during:** Tasks 1 and 2 during TypeScript compilation
- **Issue:** `createServiceClient()` returns `SupabaseClient<Database>` which enforces strict Insert/Update types. When calling `.update()` on `lois`, `loi_sections`, or inserting into `loi_negotiations`/`notifications`, TypeScript inferred the table row type as `never` due to how Supabase's type generation handles FK join partial selects. Same issue in review-data for `loi.landlord_contact_id` access.
- **Fix:** Added `as any` casts on the supabase client for affected `.update()`, `.insert()`, and `.from().select()` calls — consistent with the established pattern in the project (see `src/app/api/lois/[id]/respond/route.ts` original, and `src/app/api/leases/agreed-lois/route.ts`).
- **Files modified:** `src/app/api/lois/[id]/review-data/route.ts`, `src/app/api/lois/[id]/respond/route.ts`
- **Commits:** b1246e8, ce8ba72

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | b1246e8 | feat(06-01): authenticate review-data endpoint with multi-party access |
| 2 | ce8ba72 | feat(06-01): multi-party respond endpoint with role attribution and notifications |

## Self-Check: PASSED

Files exist:
- src/app/api/lois/[id]/review-data/route.ts — FOUND
- src/app/api/lois/[id]/respond/route.ts — FOUND
- src/lib/email/notifications.ts — FOUND
- src/lib/email/templates.ts — FOUND

Commits exist:
- b1246e8 — FOUND
- ce8ba72 — FOUND

TypeScript: 0 errors (npx tsc --noEmit clean)
