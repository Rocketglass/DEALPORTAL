---
phase: 03-role-foundation
plan: "03"
subsystem: api
tags: [invitations, supabase, rls, email, resend, typescript]

# Dependency graph
requires:
  - phase: 03-role-foundation/03-01
    provides: role expansion migration (6-role model), is_broker_or_admin() RLS helper, InvitableRole constraint values
  - phase: 03-role-foundation/03-02
    provides: auth callback invitation acceptance logic, requireBrokerOrAdminForApi auth guard
provides:
  - invitations table (supabase/migrations/014_invitations.sql) with token, role, status, expiry, deal linkage
  - POST /api/invitations — create and send invitation (broker/admin only)
  - GET /api/invitations — list all invitations (broker/admin only)
  - GET /api/invitations/:id — view single invitation
  - DELETE /api/invitations/:id — revoke pending invitation
  - POST /api/invitations/:id/resend — resend email (refreshes expiry if expired)
  - sendInvitation() lib — generates 64-char hex token, 7-day expiry, sends via Resend
  - Invitation, InvitationStatus, InvitableRole TypeScript types in database.ts
affects:
  - 03-04 (invitation accept page uses token from this plan's invitations table)
  - 04-tenant-portal (tenant onboarding via invitation flow)
  - 05-landlord-portal (landlord onboarding via invitation flow)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "sendInvitation() generates token + inserts DB record + sends email in one call; email failure is non-fatal (broker can resend)"
    - "API routes use requireBrokerOrAdminForApi() guard at entry point, then service-role client for DB operations"
    - "Resend email via dynamic import of @/lib/email/send to avoid circular deps"
    - "Agent role invitations require principalId — validated at API layer, enforced in DB constraint"

key-files:
  created:
    - supabase/migrations/014_invitations.sql
    - src/app/api/invitations/route.ts
    - src/app/api/invitations/[id]/route.ts
    - src/app/api/invitations/[id]/resend/route.ts
    - src/lib/invitations/send-invitation.ts
  modified:
    - src/types/database.ts

key-decisions:
  - "Email send failure is non-fatal — invitation record persists and broker can resend; avoids blocking invitation creation on transient email errors"
  - "Resend endpoint refreshes expiry (new 7-day window) if invitation was previously expired — simplifies broker workflow"
  - "token is 64-char lowercase hex (randomBytes(32).toString('hex')) — cryptographically secure, URL-safe"
  - "invitations_select_by_token RLS policy allows unauthenticated token lookup for safety; service-role bypasses RLS anyway"

patterns-established:
  - "Invitation creation pattern: generate token → insert DB row → send email (email failure logged not thrown)"
  - "Agent invitation guard: check role IN ('landlord_agent', 'tenant_agent') AND !principalId → 400 before DB insert"

requirements-completed: [ROLE-07]

# Metrics
duration: 5min
completed: 2026-03-28
---

# Phase 3 Plan 03: Invitation System Summary

**Broker invitation system with 64-char token, 7-day expiry, 5 REST endpoints, and Resend email delivery for onboarding landlords, tenants, and agents**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-28T01:39:46Z
- **Completed:** 2026-03-28T01:44:26Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Invitations table migration with token, role constraint, RLS, and token-based select policy for auth callback
- Full CRUD API for invitations (create, list, view, revoke, resend) with broker/admin guard
- sendInvitation() library function that creates DB record and sends Resend email atomically

## Task Commits

Each task was committed atomically:

1. **Task 1: Create invitations table migration and update TypeScript types** - `a9b6539` (feat)
2. **Task 2: Create invitation API endpoints and email sender** - `93be71f` (feat)

**Plan metadata:** (included in final commit)

## Files Created/Modified
- `supabase/migrations/014_invitations.sql` - Invitations table with RLS, indexes, role/status constraints
- `src/types/database.ts` - Added InvitationStatus, InvitableRole, Invitation interface, invitations Database table entry
- `src/lib/invitations/send-invitation.ts` - Token generation, DB insert, email send with non-fatal error handling
- `src/app/api/invitations/route.ts` - GET (list) and POST (create) endpoints
- `src/app/api/invitations/[id]/route.ts` - GET (view) and DELETE (revoke) endpoints
- `src/app/api/invitations/[id]/resend/route.ts` - POST (resend with expiry refresh) endpoint

## Decisions Made
- Email send failure is non-fatal — invitation record persists and broker can resend later
- Resend endpoint refreshes expiry window if invitation was expired — simplifies broker workflow
- `invitations_select_by_token` RLS policy added for safety even though service-role bypasses RLS

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Uses existing RESEND_API_KEY already configured.

## Next Phase Readiness
- Invitation creation and email delivery are complete
- Auth callback (03-02) already handles acceptance side — reads token, sets role, marks accepted
- Plan 03-04 (invite accept page) can build the UI that presents the invitation token flow to recipients
- Invitations table is ready for portal UI work in phases 04-05

---
*Phase: 03-role-foundation*
*Completed: 2026-03-28*
