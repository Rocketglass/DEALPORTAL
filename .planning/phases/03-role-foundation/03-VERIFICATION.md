---
phase: 03-role-foundation
verified: 2026-03-28T02:30:00Z
status: gaps_found
score: 5/7 requirements verified
gaps:
  - truth: "Landlord can log in and is routed to /landlord/dashboard"
    status: failed
    reason: "Middleware correctly redirects landlord roles to /landlord/dashboard, but no page exists at that path. The /landlord route directory does not exist in src/app/. A landlord who logs in or accepts an invitation receives a redirect to a 404."
    artifacts:
      - path: "src/app/landlord"
        issue: "Directory does not exist — no landlord portal pages have been built"
    missing:
      - "Create src/app/landlord/dashboard/page.tsx (landlord portal dashboard)"
      - "Create src/app/landlord/layout.tsx with requireLandlordOrAgent() guard"
  - truth: "Tenant can log in and is routed to /tenant/dashboard"
    status: failed
    reason: "Middleware correctly redirects tenant roles to /tenant/dashboard, but no page exists at that path. The /tenant route directory does not exist in src/app/. A tenant who logs in or accepts an invitation receives a redirect to a 404."
    artifacts:
      - path: "src/app/tenant"
        issue: "Directory does not exist — no tenant portal pages have been built"
    missing:
      - "Create src/app/tenant/dashboard/page.tsx (tenant portal dashboard)"
      - "Create src/app/tenant/layout.tsx with requireTenantOrAgent() guard"
human_verification:
  - test: "Accept a broker invitation as a new landlord user"
    expected: "User registers, auth callback reads invitation token, role is set to landlord, user is redirected to /landlord/dashboard"
    why_human: "End-to-end invitation acceptance flow involving email delivery and Supabase auth callback cannot be verified programmatically"
  - test: "Attempt to access /dashboard as a logged-in landlord user"
    expected: "Middleware redirects landlord to /landlord/dashboard, not to the broker portal"
    why_human: "Middleware redirect behavior requires a live browser session to confirm"
  - test: "Accept a broker invitation as a landlord_agent with a principalId set"
    expected: "Agent sees the same LOIs and leases as their principal (landlord) via get_effective_contact_id() RLS delegation"
    why_human: "RLS delegation behavior requires a live Supabase connection with real data rows for both principal and agent"
---

# Phase 3: Role Foundation Verification Report

**Phase Goal:** All six roles exist in the system, each role sees only what it should see, and brokers can invite landlords, tenants, and agents into the portal
**Verified:** 2026-03-28T02:30:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | System supports 6 roles: admin, broker, landlord, landlord_agent, tenant, tenant_agent | VERIFIED | `013_role_expansion.sql` line 37: CHECK constraint includes all 6 roles + pending; `UserRole` type at line 553 of database.ts |
| 2 | Broker and admin can see all data across all tables | VERIFIED | `is_broker_or_admin()` remains unchanged in migration 002; migration 013 explicitly states it is NOT modified; all new RLS policies leave broker/admin policies intact |
| 3 | Agent users have a principal_id linking them to their landlord or tenant | VERIFIED | `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS principal_id UUID REFERENCES public.users(id)` in 013; `users_agent_principal_check` constraint enforces non-agent roles have null principal_id |
| 4 | RLS helper functions recognize all 6 roles correctly | VERIFIED | Three new functions created: `get_effective_contact_id()`, `is_landlord_or_agent()`, `is_tenant_or_agent()` — all reference correct role sets |
| 5 | Existing broker/admin workflows are not broken | VERIFIED | is_broker_or_admin() untouched (comment-documented in migration header); all pre-existing broker-side RLS policies intact |
| 6 | Landlord can log in and is routed to /landlord/dashboard | FAILED | Middleware routing logic exists and is correct, but `src/app/landlord/` directory does not exist — redirect leads to 404 |
| 7 | Tenant can log in and is routed to /tenant/dashboard | FAILED | Middleware routing logic exists and is correct, but `src/app/tenant/` directory does not exist — redirect leads to 404 |
| 8 | Landlord agent and tenant agent route to correct portals | PARTIAL | Routing logic in middleware.ts handles landlord_agent and tenant_agent correctly (lines 317-318), but the destination pages don't exist for the same reason as truths 6-7 |
| 9 | Broker can create an invitation with a unique token, target email, role, and optional deal linkage | VERIFIED | `POST /api/invitations` creates invitation via `sendInvitation()`, validates roles, enforces principalId for agents, generates 64-char hex token with 7-day expiry |
| 10 | Invitation email is sent and token is single-use with 7-day expiry | VERIFIED | `sendInvitation()` creates record then sends email via `@/lib/email/send`; token is `randomBytes(32).toString('hex')`; expiry is 7 days from creation |
| 11 | Broker can list, view, and resend invitations | VERIFIED | GET /api/invitations, GET /api/invitations/[id], POST /api/invitations/[id]/resend — all guarded by requireBrokerOrAdminForApi() |

**Score:** 9/11 truths verified (2 failed: landlord/tenant portal pages missing)

---

## Required Artifacts

### Plan 01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/013_role_expansion.sql` | Schema migration: 2 new roles + principal_id + RLS | VERIFIED | 306-line file exists; all required sections present |
| `src/types/database.ts` | Updated UserRole type with 6 roles | VERIFIED | Line 553: `export type UserRole = 'admin' | 'broker' | 'tenant' | 'landlord' | 'tenant_agent' | 'landlord_agent'`; User interface has principal_id at line 235 |

### Plan 02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/security/auth-guard.ts` | New auth guard functions for landlord and tenant roles | VERIFIED | requireLandlordOrAgent, requireTenantOrAgent, requireLandlordOrAgentForApi, requireTenantOrAgentForApi all present; AuthUser has principalId; requireOwnership supports agent delegation |
| `src/lib/supabase/middleware.ts` | Role-based routing for all 6 roles | VERIFIED | BROKER_PORTAL_ROUTES, LANDLORD_PORTAL_ROUTES, TENANT_PORTAL_ROUTES defined; role-routing block at lines 316-363 |
| `src/app/auth/callback/route.ts` | Invitation token handling | VERIFIED | invitationToken read from ?invitation= param; service client used to accept invitation and set role/contact_id/principal_id; role-aware default redirect |
| `src/lib/supabase/service.ts` | Service-role Supabase client | VERIFIED | Created during plan 02 execution; uses SUPABASE_SERVICE_ROLE_KEY, bypasses RLS, typed with Database |
| `src/app/landlord/` | Landlord portal pages | MISSING | No landlord route directory exists anywhere in src/app/; ROLE-03 deferred per REQUIREMENTS.md |
| `src/app/tenant/` | Tenant portal pages | MISSING | No tenant route directory exists anywhere in src/app/; ROLE-04 deferred per REQUIREMENTS.md |

### Plan 03 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/014_invitations.sql` | Invitations table with token, role, status, RLS | VERIFIED | CREATE TABLE with all required fields; 4 broker/admin RLS policies + token-based select policy |
| `src/app/api/invitations/route.ts` | GET (list) + POST (create) | VERIFIED | Both handlers exist; requireBrokerOrAdminForApi at entry; role validation and agent principalId validation in POST |
| `src/app/api/invitations/[id]/route.ts` | GET (view) + DELETE (revoke) | VERIFIED | Both handlers exist with broker guard |
| `src/app/api/invitations/[id]/resend/route.ts` | POST (resend with expiry refresh) | VERIFIED | Exists; refreshes expiry if expired; sends via sendEmail |
| `src/lib/invitations/send-invitation.ts` | Token generation + DB insert + email send | VERIFIED | randomBytes(32).toString('hex') for token; 7-day expiry; sendEmail via dynamic import; email failure is non-fatal |
| `src/types/database.ts` (invitations additions) | Invitation, InvitationStatus, InvitableRole types + Database table entry | VERIFIED | All three types present at lines 638-657; invitations table entry at lines 139-148 |

---

## Key Link Verification

### Plan 01 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `013_role_expansion.sql` | public.users table | ALTER TABLE adding principal_id + updated role CHECK | WIRED | Line 27: `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS principal_id UUID REFERENCES public.users(id)` |
| `013_role_expansion.sql` | public.is_broker_or_admin() | CREATE OR REPLACE — must remain unchanged | WIRED | Function is referenced in comment as NOT modified; original definition intact in migration 002 |
| `src/types/database.ts` | `src/lib/security/auth-guard.ts` | UserRole type import | WIRED | auth-guard.ts line 13: `import type { UserRole } from '@/types/database'` |

### Plan 02 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `middleware.ts` | `auth-guard.ts` | Role routing logic feeds portal guards | WIRED | LANDLORD_PORTAL_ROUTES and TENANT_PORTAL_ROUTES defined (lines 23-32) and used in routing block |
| `auth/callback/route.ts` | public.users table | Upsert with role from invitation token | WIRED | Lines 99-107: service client updates role, contact_id, principal_id from invitation |

### Plan 03 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/api/invitations/route.ts` | `src/lib/invitations/send-invitation.ts` | API route calls sendInvitation() after creating record | WIRED | Line 70: `const result = await sendInvitation({...})` |
| `src/lib/invitations/send-invitation.ts` | `src/lib/email/send.ts` | Dynamic import of sendEmail | WIRED | Lines 65-80: `const { sendEmail } = await import('@/lib/email/send')` |
| `supabase/migrations/014_invitations.sql` | public.invitations table | CREATE TABLE with all required fields | WIRED | Table created with token, role, status, expires_at, principal_id, deal_id |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ROLE-01 | 03-01 | System supports 6 roles | SATISFIED | Role CHECK constraint in 013; UserRole type in database.ts; 6 roles confirmed |
| ROLE-02 | 03-01 | Broker can see all data | SATISFIED | is_broker_or_admin() unchanged; broker_or_admin check on all broker-facing tables |
| ROLE-03 | 03-02 | Landlord can log in and access their portal | BLOCKED | Middleware routing is in place but /landlord/dashboard page does not exist; REQUIREMENTS.md marks this Pending |
| ROLE-04 | 03-02 | Tenant can log in and access their portal | BLOCKED | Middleware routing is in place but /tenant/dashboard page does not exist; REQUIREMENTS.md marks this Pending |
| ROLE-05 | 03-01 | Landlord agent can act on behalf of a landlord | SATISFIED | principal_id FK, users_agent_principal_check constraint, get_effective_contact_id() delegation, requireLandlordOrAgent() guard |
| ROLE-06 | 03-01 | Tenant agent can act on behalf of a tenant | SATISFIED | Same delegation pattern; is_tenant_or_agent() helper; requireTenantOrAgent() guard |
| ROLE-07 | 03-03 | Broker can invite landlords, tenants, and agents | SATISFIED | Full invitation system: 014 migration, 5 API endpoints, sendInvitation() lib, auth callback acceptance |

**Note on ROLE-03 and ROLE-04:** The REQUIREMENTS.md file marks both as "Pending" and this is consistent with the phase design. Plan 03-02 delivers the routing infrastructure (middleware + auth guards) — the actual portal pages are planned for Phase 4 (tenant portal) and Phase 5 (landlord portal). This is a known and intentional gap, not an oversight. The phase goal as stated ("Landlord can log into the portal and access their properties' deals") cannot be fully confirmed until those pages exist.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/auth/callback/route.ts` | 88-89 | `as any` cast on serviceSupabase | Info | Documented in SUMMARY as intentional until 03-03 typed the invitations table. 03-03 has now added the type — this cast can be removed in a follow-up. No functional impact. |

No blocking anti-patterns found. No TODOs, placeholders, or empty implementations in phase 03 files.

---

## Human Verification Required

### 1. Invitation Acceptance Flow (End-to-End)

**Test:** Have broker call `POST /api/invitations` with a real email and role=landlord. Recipient clicks the email link, creates an account, completes auth callback.
**Expected:** User row in public.users gets role=landlord, contact_id and principal_id set correctly, invitation row is marked accepted, user is redirected to /landlord/dashboard (will 404 until Phase 5 builds the page).
**Why human:** Email delivery and Supabase PKCE/OAuth code exchange cannot be verified programmatically.

### 2. Role-Based Redirect on Login

**Test:** Log in as a landlord user (role=landlord in users table) via /login.
**Expected:** Middleware queries role, redirects to /landlord/dashboard instead of /dashboard.
**Why human:** Middleware redirect behavior requires a live browser session with an active Supabase auth session.

### 3. Agent RLS Delegation

**Test:** Create a landlord user and a landlord_agent user with principal_id pointing to the landlord. Confirm the agent can SELECT from the lois table where landlord_contact_id matches the landlord's contact_id.
**Expected:** get_effective_contact_id() returns the landlord's contact_id when called as the agent, granting access via RLS.
**Why human:** Requires a live Supabase database with RLS enabled and test data rows for both users and a LOI record.

### 4. Broker Accesses Landlord Portal

**Test:** Log in as a broker and navigate to /landlord/dashboard (once pages exist in Phase 5).
**Expected:** Broker is NOT redirected away — middleware allows broker/admin to access all portals.
**Why human:** Requires pages to exist and a live browser session.

---

## Gaps Summary

Two truths fail due to the same root cause: **landlord and tenant portal pages do not yet exist.**

The middleware in `src/lib/supabase/middleware.ts` correctly routes landlords to `/landlord/dashboard` and tenants to `/tenant/dashboard`. The auth callback correctly redirects post-login to these paths. The auth guards (`requireLandlordOrAgent`, `requireTenantOrAgent`) are correctly defined and exported. The RLS policies ensure these roles see only their own data.

However, there is no `src/app/landlord/` or `src/app/tenant/` directory in the codebase. Any landlord or tenant who completes the auth flow will receive a 404 at the destination URL.

This is a **known and planned gap**: REQUIREMENTS.md explicitly marks ROLE-03 and ROLE-04 as "Pending," and the traceability matrix assigns them to Phase 3 with status "Pending." The plans for Phase 4 (tenant portal) and Phase 5 (landlord portal) are responsible for building the destination pages. Phase 3's scope was to create the infrastructure (schema, RLS, routing rules, invitation system) — not the portal UI.

**The 5 infrastructure requirements (ROLE-01, ROLE-02, ROLE-05, ROLE-06, ROLE-07) are fully satisfied.** The 2 portal-access requirements (ROLE-03, ROLE-04) require Phase 4 and Phase 5 work to complete.

---

_Verified: 2026-03-28T02:30:00Z_
_Verifier: Claude (gsd-verifier)_
