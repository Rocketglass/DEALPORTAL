# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-27)

**Core value:** Compress the time from tenant interest to executed lease by replacing every manual handoff with a single connected digital pipeline where all parties collaborate in-portal.
**Current focus:** Phase 3 — Role Foundation (v1.1)

## Current Position

Phase: 3 of 7 (Role Foundation)
Plan: 2 of 4
Status: In progress
Last activity: 2026-03-27 — Completed plan 03-02 (role-based auth guards, middleware routing, invitation callback)

Progress: [██░░░] 8% (v1.1 phases 3-7)

## Performance Metrics

**Velocity:**
- Total plans completed: 2 (v1.1)
- Average duration: 10 min
- Total execution time: 19 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 03-role-foundation | 2 | 19 min | 10 min |

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions logged in PROJECT.md Key Decisions table. Key decisions affecting v1.1:

- Architecture: Stay on existing Next.js + Supabase stack, no new infrastructure
- Auth: Extend Supabase Auth roles — do not replace the auth system
- RLS: All new data access must go through Supabase Row Level Security policies
- Backward compat: Existing broker workflows must continue working throughout v1.1 build
- Public page replacement: /loi/[id]/review (public) becomes authenticated landlord portal view

From 03-01 (role expansion):
- Soft principal_id constraint: non-agent roles must have null principal_id, agent roles enforce at application level (not DB-level NOT NULL) to avoid migration sequencing issues
- is_broker_or_admin() intentionally unchanged — agents never get full pipeline access
- Agent delegation via get_effective_contact_id() centralizes logic; all tables use this one function
- users_insert_self unchanged — agent invitations handled in plan 03-03 with a separate policy

From 03-02 (auth guards + routing):
- Broker/admin can access ALL portals (landlord, tenant, broker) — intentional for support use case
- invitations table queries use `as any` cast in auth callback until 03-03 adds the typed table to Database type
- Service client (src/lib/supabase/service.ts) created for RLS bypass in trusted server contexts

### Pending Todos

None yet.

### Blockers/Concerns

None yet. Key architectural note: Phase 3 (roles + RLS) must be fully complete before any portal UI work begins — all downstream phases depend on it.

## Session Continuity

Last session: 2026-03-27
Stopped at: Completed 03-02-PLAN.md (role-based auth guards, middleware routing, invitation callback)
Resume file: None
