---
phase: 03-role-foundation
plan: 01
subsystem: database
tags: [supabase, rls, postgres, sql, typescript, roles, multi-party]

# Dependency graph
requires: []
provides:
  - "6-role schema: admin, broker, landlord, landlord_agent, tenant, tenant_agent"
  - "principal_id column on users table for agent delegation"
  - "get_effective_contact_id() helper function for agent-transparent RLS"
  - "is_landlord_or_agent() and is_tenant_or_agent() helper functions"
  - "RLS policies for tenant access to lois, loi_sections, loi_negotiations, leases"
  - "RLS policies updated so agents inherit principal's data access"
  - "UserRole TypeScript type with all 6 roles"
  - "User interface with principal_id field"
affects:
  - "03-role-foundation (plans 02-04 depend on these roles and helper functions)"
  - "04-tenant-portal (tenant RLS policies are in place)"
  - "05-landlord-portal (landlord + agent RLS policies are in place)"
  - "06-invitation-flow (principal_id schema ready for agent invitations)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Agent delegation via principal_id self-referential FK on users table"
    - "get_effective_contact_id() pattern: agents transparently inherit principal contact access in all RLS policies"
    - "Soft DB constraint for principal_id (required at application level, not DB level, to avoid migration issues)"

key-files:
  created:
    - "supabase/migrations/013_role_expansion.sql"
  modified:
    - "src/types/database.ts"

key-decisions:
  - "Softer principal_id constraint: non-agent roles must have null, agent roles may have non-null (not required at DB level to avoid migration ordering issues)"
  - "is_broker_or_admin() left unchanged — only broker and admin have full pipeline access, agents never bypass this"
  - "users_insert_self unchanged — self-registration stays pending-only; agent invitation will be a separate policy in plan 03"
  - "Agent delegation via get_effective_contact_id() rather than duplicating policies — single function change propagates across all tables"

patterns-established:
  - "Agent transparency: all RLS policies use get_effective_contact_id() so landlord_agent and tenant_agent users see exactly what their principal sees — no separate policy branches"
  - "Idempotent migration: all ALTER TABLE use IF NOT EXISTS / DROP CONSTRAINT IF EXISTS so migration can be re-run safely"

requirements-completed: [ROLE-01, ROLE-02, ROLE-05, ROLE-06]

# Metrics
duration: 7min
completed: 2026-03-27
---

# Phase 3 Plan 1: Role Expansion + Agent Delegation Foundation Summary

**Supabase schema expanded to 6 roles with principal_id agent delegation and get_effective_contact_id() RLS transparency, plus TypeScript UserRole updated to match.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-27T16:35:30Z
- **Completed:** 2026-03-27T16:42:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created 305-line SQL migration adding landlord_agent and tenant_agent roles with full RLS coverage across lois, loi_sections, loi_negotiations, leases, applications, application_documents, and contacts tables
- Added get_effective_contact_id() helper that transparently returns an agent's principal's contact_id, so all downstream RLS policies work unchanged for both principal and agent users
- Updated TypeScript UserRole type and User interface with principal_id field; tsc --noEmit passes with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create database migration for role expansion and agent delegation** - `232e844` (feat)
2. **Task 2: Update TypeScript types for 6-role model with agent delegation** - `ed7d9ae` (feat)

**Plan metadata:** (docs commit follows this summary)

## Files Created/Modified

- `supabase/migrations/013_role_expansion.sql` — Full schema migration: principal_id column, updated role CHECK constraint, users_agent_principal_check constraint, 3 new helper functions, updated+new RLS policies across 7 tables
- `src/types/database.ts` — UserRole expanded from 4 to 6 values; User interface gains principal_id field

## Decisions Made

- **Soft principal_id constraint:** Non-agent roles must have null principal_id, but agent roles only need it at application level (not enforced as NOT NULL at DB level). Avoids migration sequencing issues when creating agent users before their principal is confirmed.
- **is_broker_or_admin() unchanged:** Deliberately left to only cover broker/admin. Agents never get full pipeline access — they see only what their principal can see.
- **Agent transparency via single helper:** get_effective_contact_id() centralizes the agent delegation logic. All new RLS policies use it, so future tables added to the schema just need to reference this one function.
- **DROP POLICY IF EXISTS before recreate:** Made all updated policies idempotent — migration is safe to run in any environment state.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. The migration must be run against the Supabase database via the standard `supabase db push` or Supabase dashboard SQL editor.

## Next Phase Readiness

- Role schema is complete — plans 03-02 (auth guard), 03-03 (invitation flow), and 03-04 (middleware) can all proceed
- get_effective_contact_id() is available for all future RLS policies
- TypeScript types are in sync — no compile errors, existing code continues to work
- Broker/admin workflows are fully backward compatible

---
*Phase: 03-role-foundation*
*Completed: 2026-03-27*
