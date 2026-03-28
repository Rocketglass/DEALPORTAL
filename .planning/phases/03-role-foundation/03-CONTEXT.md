# Phase 3: Role Foundation - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Expand the auth system from 4 roles (admin, broker, tenant, landlord) to 6 roles (+ landlord_agent, tenant_agent). Update RLS policies so each role sees only its authorized data. Add broker-managed invitation flow for onboarding landlords, tenants, and agents. Add agent delegation so agents can act on behalf of principals.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

All implementation choices are at Claude's discretion — infrastructure phase. Key constraints:

- Must extend existing Supabase Auth — do not replace the auth system
- Must use Supabase RLS for all data access enforcement
- Existing broker workflows must continue working (backward compatible)
- The users table already has `role` column (type UserRole) — extend the enum
- The middleware already checks roles for protected routes — extend the role checks
- Agent delegation: landlord_agent inherits landlord access; tenant_agent inherits tenant access. Store the principal_id on the users table to link agent → principal.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/security/auth-guard.ts` — requireAuth, requireRole, requireBrokerOrAdmin, requireBrokerOrAdminForApi, requireOwnership, requireAuthForApi
- `src/types/database.ts` — UserRole type (`'admin' | 'broker' | 'tenant' | 'landlord'`)
- `src/lib/supabase/middleware.ts` — PROTECTED_PORTAL_ROUTES, role-based redirect logic, RLS via Supabase client

### Established Patterns
- Auth checks: Server Components use `requireAuth()` / `requireBrokerOrAdmin()`. API routes use `requireBrokerOrAdminForApi()`.
- Role check pattern: `requireRole(...allowedRoles)` — variadic, returns AuthUser
- Middleware: checks `isProtectedRoute()` then fetches user role from `users` table
- RLS: Supabase handles row-level security via auth user ID

### Integration Points
- `UserRole` type in `src/types/database.ts` — add new roles here
- `PROTECTED_PORTAL_ROUTES` in middleware — add landlord/tenant portal routes
- Auth guard functions — add `requireLandlordOrAgent()`, `requireTenantOrAgent()` etc.
- Users table in Supabase — add `principal_id` column for agent delegation
- Registration flow — extend to handle invitation-based signup

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Standard role-based access control with agent delegation.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
