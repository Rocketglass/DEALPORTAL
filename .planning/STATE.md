---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Multi-Party Portal
status: executing
stopped_at: Completed 06-02-PLAN.md (shared LoiNegotiationView, landlord/tenant LOI pages, portal nav updates)
last_updated: "2026-03-28T02:50:50.524Z"
last_activity: "2026-03-28 — Completed plan 03-03 (invitation system: table, API endpoints, email sender)"
progress:
  total_phases: 5
  completed_phases: 4
  total_plans: 10
  completed_plans: 10
  percent: 12
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-27)

**Core value:** Compress the time from tenant interest to executed lease by replacing every manual handoff with a single connected digital pipeline where all parties collaborate in-portal.
**Current focus:** Phase 3 — Role Foundation (v1.1)

## Current Position

Phase: 3 of 7 (Role Foundation)
Plan: 3 of 4
Status: In progress
Last activity: 2026-03-28 — Completed plan 03-03 (invitation system: table, API endpoints, email sender)

Progress: [███░░] 12% (v1.1 phases 3-7)

## Performance Metrics

**Velocity:**
- Total plans completed: 3 (v1.1)
- Average duration: 8 min
- Total execution time: 24 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 03-role-foundation | 3 | 24 min | 8 min |

*Updated after each plan completion*
| Phase 04-general-application-flow P04-01 | 3 | 3 tasks | 5 files |
| Phase 04-general-application-flow P04-02 | 4 | 3 tasks | 3 files |
| Phase 05-landlord-and-tenant-portals P05-01 | 2 | 2 tasks | 3 files |
| Phase 05-landlord-and-tenant-portals P05-03 | 3 | 2 tasks | 3 files |
| Phase 05-landlord-and-tenant-portals P05-02 | 4 | 2 tasks | 6 files |
| Phase 06-in-portal-loi-negotiation P06-01 | 6 | 2 tasks | 4 files |
| Phase 06-in-portal-loi-negotiation PP06-02 | 3 | 2 tasks | 5 files |

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

From 03-03 (invitation system):
- Email send failure is non-fatal — invitation record persists, broker can resend; avoids blocking on transient email errors
- Resend endpoint refreshes expiry (new 7-day window) if invitation was expired — simplifies broker workflow
- token is 64-char hex (randomBytes(32).toString('hex')) — cryptographically secure and URL-safe
- invitations_select_by_token RLS policy added for token-based public lookup safety (service-role bypasses RLS anyway)
- [Phase 04-general-application-flow]: Service client used for draft API to avoid RLS race window on first insert
- [Phase 04-general-application-flow]: Junction table insert failure is non-fatal — log but never block the 201 application response
- [Phase 04-general-application-flow]: application_drafts uses UNIQUE(user_id) — one draft per user, upsert on conflict
- [Phase 04-general-application-flow]: STORAGE_KEY changed to rr_application_draft_v2 to avoid collisions with old 5-step draft format
- [Phase 04-general-application-flow]: QR redirect no longer uses qrCode.portal_url — always routes to /apply?property=UUID
- [Phase 04-general-application-flow]: Server draft takes priority over localStorage draft when authenticated user returns to /apply
- [Phase 05-landlord-and-tenant-portals]: PortalSidebar derives settings href from first navItem prefix — keeps component API minimal without a separate settingsHref prop
- [Phase 05-landlord-and-tenant-portals]: Both portal layouts include broker/admin in requireRole() — brokers need cross-portal access for support use cases
- [Phase 05-landlord-and-tenant-portals]: Lease-to-application join goes via LOI (leases.loi_id) not direct application_id — matches DB schema
- [Phase 05-landlord-and-tenant-portals]: Supabase returns related rows as arrays even for FK single joins; handled with Array.isArray guard in tenant query
- [Phase 05-02]: No owner_contact_id on Property — landlord-property relationship derived from lois/leases.landlord_contact_id; service client used for landlord queries with auth at page level via requireRole()
- [Phase 06-01]: requireAuthForApi() used in API routes (throws) rather than requireAuth() (redirects) — API routes must return JSON 401, not redirect to /login
- [Phase 06-01]: Service client used for LOI respond writes (bypasses RLS); auth enforced at application layer via requireAuthForApi()
- [Phase 06-in-portal-loi-negotiation]: Per-section submit instead of batch for LoiNegotiationView — multi-party negotiation benefits from granular responses with UI refetch after each submit
- [Phase 06-in-portal-loi-negotiation]: Shared LoiNegotiationView component with callerRole prop used by all 3 portals — landlord, tenant, broker render same component
- [Phase 06-in-portal-loi-negotiation]: Three-party timeline colors extended: broker=blue (#1e40af), landlord=amber-500, tenant=emerald-500

### Pending Todos

None yet.

### Blockers/Concerns

None yet. Key architectural note: Phase 3 (roles + RLS) must be fully complete before any portal UI work begins — all downstream phases depend on it.

## Session Continuity

Last session: 2026-03-28T02:50:50.521Z
Stopped at: Completed 06-02-PLAN.md (shared LoiNegotiationView, landlord/tenant LOI pages, portal nav updates)
Resume file: None
