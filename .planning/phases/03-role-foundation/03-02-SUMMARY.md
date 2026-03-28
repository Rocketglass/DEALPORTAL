---
phase: 03-role-foundation
plan: 02
subsystem: auth
tags: [auth-guard, middleware, routing, invitation, roles]
dependency_graph:
  requires: [03-01]
  provides: [role-based-routing, portal-auth-guards, invitation-acceptance]
  affects: [all-portal-pages, api-routes]
tech_stack:
  added: [src/lib/supabase/service.ts]
  patterns: [role-based-redirect, agent-delegation-ownership, invitation-token-flow]
key_files:
  created:
    - src/lib/supabase/service.ts
  modified:
    - src/lib/security/auth-guard.ts
    - src/lib/supabase/middleware.ts
    - src/app/auth/callback/route.ts
    - src/lib/api/__tests__/handler.test.ts
decisions:
  - brokers-access-all-portals: Broker/admin roles can access landlord and tenant portals (support use case), no redirect applied
  - invitation-any-cast: invitations table queries use `as any` cast until 03-03 adds the typed table to Database type
  - service-client-pattern: Service client bypasses RLS for invitation acceptance — only used server-side in trusted contexts
metrics:
  duration: 12 min
  completed: 2026-03-27
  tasks_completed: 2
  files_changed: 5
---

# Phase 3 Plan 2: Role-Based Auth Guards and Portal Routing Summary

Role-aware middleware routing and auth guards for 6-role model — landlord/landlord_agent route to /landlord/*, tenant/tenant_agent route to /tenant/*, broker/admin access all portals, with invitation token acceptance flow.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add role-aware auth guard functions and update AuthUser | 5847b1a | src/lib/security/auth-guard.ts, src/lib/api/__tests__/handler.test.ts |
| 2 | Update middleware for role-based portal routing | 0ba4fd3 | src/lib/supabase/middleware.ts, src/app/auth/callback/route.ts, src/lib/supabase/service.ts |

## What Was Built

**auth-guard.ts changes:**
- Added `principalId: string | null` to `AuthUser` interface
- Updated `requireAuth()` and `requireAuthForApi()` to select and return `principal_id`
- Added `requireLandlordOrAgent()` — server component guard for landlord portal routes
- Added `requireTenantOrAgent()` — server component guard for tenant portal routes
- Added `requireLandlordOrAgentForApi()` — API route guard for landlord portal API
- Added `requireTenantOrAgentForApi()` — API route guard for tenant portal API
- Updated `requireOwnership()` to support agent delegation — agents can access their principal's data via `principalId`

**middleware.ts changes:**
- Refactored `PROTECTED_PORTAL_ROUTES` into `BROKER_PORTAL_ROUTES`, `LANDLORD_PORTAL_ROUTES`, `TENANT_PORTAL_ROUTES`
- Added `/invite` to `PUBLIC_ROUTES` for invitation acceptance pages
- Added role-routing block that redirects non-broker users away from broker portal, non-landlord from landlord portal, non-tenant from tenant portal
- Broker/admin can access all portals with no redirect (intentional — support use case)
- Updated post-login redirect on auth pages to query user role and route to correct portal

**auth/callback/route.ts changes:**
- Reads `?invitation=` query param
- After initial upsert, checks for valid pending invitation matching the token
- Assigns role, contact_id, and principal_id from invitation to user row via service client
- Marks invitation as accepted with timestamp and user ID
- Redirects to role-appropriate portal on invitation acceptance
- Default redirect is now role-aware (not always /dashboard)

**service.ts (new):**
- Service role Supabase client that bypasses RLS
- Used only server-side for trusted operations (invitation acceptance)
- Requires `SUPABASE_SERVICE_ROLE_KEY` env var

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated test mock to include principalId**
- **Found during:** Task 1 — TypeScript compile check
- **Issue:** `src/lib/api/__tests__/handler.test.ts` had a mock `AuthUser` object missing the new `principalId` field, causing a TypeScript error
- **Fix:** Added `principalId: null` to the mock object in the test
- **Files modified:** src/lib/api/__tests__/handler.test.ts
- **Commit:** 5847b1a

**2. [Rule 3 - Missing dependency] Created service.ts Supabase client**
- **Found during:** Task 2 — the auth callback requires `@/lib/supabase/service` for invitation acceptance
- **Issue:** The file did not exist yet
- **Fix:** Created `src/lib/supabase/service.ts` with a service-role client using `createClient` from `@supabase/supabase-js`
- **Files modified:** src/lib/supabase/service.ts (created)
- **Commit:** 0ba4fd3

**3. [Rule 1 - Type] Cast serviceSupabase to `any` for invitations queries**
- **Found during:** Task 2 — TypeScript compile check
- **Issue:** `invitations` table is not yet in the `Database` type (added in 03-03), causing `from('invitations')` to return `never`
- **Fix:** Cast the service client to `any` with an eslint-disable comment; will be properly typed when 03-03 adds the invitations table
- **Files modified:** src/app/auth/callback/route.ts
- **Commit:** 0ba4fd3

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Broker portal access | Broker/admin can access ALL portals | Support use case — broker needs to see what landlords/tenants see |
| Invitation type safety | `as any` cast until 03-03 | Avoids blocking compilation; invitations table is typed in next plan |
| Service client location | `src/lib/supabase/service.ts` | Consistent with server.ts pattern; isolated to prevent accidental browser use |

## Self-Check: PASSED

All files exist and all commits are present in git history.
