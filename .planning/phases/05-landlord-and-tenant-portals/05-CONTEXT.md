# Phase 5: Landlord and Tenant Portals - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Build authenticated portal dashboards for landlords and tenants — replacing the current public unauthenticated pages. Landlord sees their properties, incoming applications, tenant financial docs, and deal pipeline. Tenant sees their application status, LOI negotiation progress, and lease/signing progress. Both use the same login flow, routed by role to their respective portal.

</domain>

<decisions>
## Implementation Decisions

### Landlord Portal
- Route group: `src/app/(landlord)/landlord/` — protected by `requireLandlordOrAgent()`
- Dashboard at `/landlord/dashboard` — shows properties the landlord owns, deal pipeline per property
- Applications view at `/landlord/applications` — lists applications for landlord's properties
- Application detail shows: tenant business info, contact details, AND financial documents (tax returns, bank statements, P&L, business license)
- Financial doc access: landlord gets read access to application_documents via RLS (already set up in Phase 3 migration via `is_landlord_or_agent()`)
- Document viewing: use signed URLs from Supabase Storage (same pattern as broker)
- Layout: sidebar navigation like the broker portal, but scoped to landlord-relevant pages

### Tenant Portal
- Route group: `src/app/(tenant)/tenant/` — protected by `requireTenantOrAgent()`
- Dashboard at `/tenant/dashboard` — shows their applications and deal progress
- Application detail shows: status, submitted docs, LOI status if exists, lease status if exists
- Uses the same deal pipeline tracker built in the status page but now authenticated and richer
- Layout: simpler than broker — sidebar with Dashboard, Applications, Documents

### Shared Layout
- Both portals use the same visual language as the broker dashboard (Stripe-like, clean, professional)
- Same sidebar component pattern but with role-specific navigation items
- Same header with notifications bell and user menu
- Sign out works the same way

### Claude's Discretion
- Exact sidebar navigation items beyond the minimum required
- Card layouts and data density
- Whether to show analytics/charts on landlord dashboard

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/(portal)/` — existing broker portal route group with layout, sidebar, header
- `src/components/layout/sidebar.tsx` — sidebar component (may need to be made role-aware)
- `src/components/layout/portal-header.tsx` — header with notifications and user menu
- `src/app/(portal)/applications/` — application list and review pages (broker version)
- `src/app/(public)/applications/status/status-client.tsx` — tenant status tracker with LOI/lease progress (already built)
- Auth guards: `requireLandlordOrAgent()`, `requireTenantOrAgent()` from Phase 3

### Established Patterns
- Route groups: `(portal)` for broker, `(public)` for unauthenticated
- Server Components fetch data, Client Components handle interactivity
- Data tables with search, filter, sort, bulk actions
- Status badges with color coding

### Integration Points
- Middleware routing: `/landlord/*` and `/tenant/*` already wired in Phase 3
- RLS policies already grant appropriate access per role
- `applications` API returns data filtered by RLS
- `application_documents` API with signed URLs for doc viewing

</code_context>

<specifics>
## Specific Ideas

- Landlord must be able to see tenant financial documents — this is critical for deal evaluation
- Tenant portal should show the full deal pipeline (application → LOI → lease → signed)
- Both portals need to feel as polished as the broker dashboard

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
