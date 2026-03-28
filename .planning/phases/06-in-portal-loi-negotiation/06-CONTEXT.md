# Phase 6: In-Portal LOI Negotiation - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the public unauthenticated LOI review page with an authenticated in-portal negotiation experience. All three parties (broker, landlord, tenant) can view LOI sections, accept/counter/reject, and see the full negotiation history — all within their respective portal dashboards. Every section update triggers email + in-app notifications to the other two parties.

</domain>

<decisions>
## Implementation Decisions

### LOI View Architecture
- Create a shared LOI detail component that renders identically across all three portals
- Route: `/landlord/lois/[id]`, `/tenant/lois/[id]`, and existing `/lois/[id]` (broker)
- All use the same underlying LOI data — RLS controls who can see what
- The public `/loi/[id]/review` page is deprecated (redirect to login with context)

### Negotiation Actions
- ALL three parties can accept, counter, or reject any LOI section (not just landlord)
- Each action is recorded in `loi_negotiations` table with `created_by` attribution
- Counter includes a text area for the counter-proposal value
- Reject includes an optional reason text area
- Broker can respond to counters from either party

### Notification Model
- When any party updates a section: email + in-app notification to the OTHER TWO parties
- Use existing `notifyLoiCountered()` and `notifyLoiAgreed()` — extend to send to all relevant parties
- In-app: insert into `notifications` table for each recipient
- Email: fire-and-forget via Resend

### API Design
- Extend existing `/api/lois/[id]/respond` to accept authenticated requests from any role (not just public)
- Add role validation: user must be a party to the LOI (tenant, landlord, broker, or their agent)
- The `review-data` endpoint becomes authenticated — no more public access

### Claude's Discretion
- Whether to show a side-by-side comparison of proposed vs. counter values
- Animation/transition details for section status changes
- Exact notification email template wording for multi-party updates

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/(public)/loi/[id]/review/page.tsx` — current landlord review page with section cards, accept/counter/reject buttons, submit flow. This is the template to replicate in-portal.
- `src/app/(portal)/lois/[id]/` — broker LOI detail page with action buttons, negotiation tracker
- `src/app/api/lois/[id]/respond/route.ts` — POST endpoint for section responses
- `src/app/api/lois/[id]/review-data/route.ts` — GET endpoint for LOI sections
- `src/lib/email/notifications.ts` — notifyLoiCountered, notifyLoiAgreed functions
- `loi_sections` table with status (proposed/countered/accepted/rejected), agreed_value, landlord_response
- `loi_negotiations` table with full audit trail

### Established Patterns
- Section card UI: icon + label + proposed value + action buttons (Accept/Counter/Reject)
- Progress bar: X of Y sections reviewed with percentage
- Status badges: green (accepted), amber (countered), red (rejected), blue (proposed)

### Integration Points
- Landlord portal: add `/landlord/lois/` route
- Tenant portal: add `/tenant/lois/` route
- Notification system: extend to multi-party
- RLS: loi_sections and loi_negotiations already have role-based policies from Phase 3

</code_context>

<specifics>
## Specific Ideas

- Both LOI and lease should be negotiated by all parties in the portal
- When one party updates, Rocket and the other party should be able to review and get a notification
- Three parties: landlord and his agent, tenant and his agent, broker (Rocket)
- Rocket should be able to see everything

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
