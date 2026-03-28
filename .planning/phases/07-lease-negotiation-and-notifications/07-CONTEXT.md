# Phase 7: Lease Negotiation and Notifications - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Add in-portal lease term negotiation (all three parties can review and propose changes before DocuSign). Complete the notification layer so email + in-app notifications fire for both LOI and lease events across all parties. Once all parties agree on lease terms, broker generates PDF and sends to DocuSign.

</domain>

<decisions>
## Implementation Decisions

### Lease Negotiation Model
- Lease terms become negotiable sections similar to LOI sections
- Add `lease_term_proposals` table to track proposed changes to lease fields
- Each proposal: field_name, proposed_value, proposed_by (role), status (proposed/accepted/rejected)
- All three parties can view current lease terms and propose changes
- When a proposal is made, the other two parties get notified
- When all proposals are resolved (accepted or rejected), broker can generate PDF and send to DocuSign
- The existing `mapLoiToLease()` auto-population still works — it sets initial values, then parties can negotiate from there

### Lease Negotiation UI
- Follow the same pattern as LOI negotiation: shared component used across all three portals
- Route: `/landlord/leases/[id]`, `/tenant/leases/[id]`, existing `/leases/[id]`
- Show lease fields grouped by AIR form section (1.1 Parties, 1.3 Term, 1.5 Base Rent, etc.)
- Each field shows current value + "Propose Change" button
- Proposal shows who proposed, what they proposed, accept/reject for other parties
- Once all proposals resolved, broker sees "Generate PDF & Send to DocuSign" button

### Notification Layer
- LOI notifications already wired in Phase 6 (notifyLoiSectionUpdate)
- Add lease term proposal notifications (same pattern: email + in-app to other two parties)
- In-app notification badge: count unread notifications, show in header
- Badge should update on page navigation (not real-time WebSocket — polling on nav is sufficient)

### Claude's Discretion
- Exact grouping of lease fields for the negotiation view
- Whether to show a diff-view for proposed changes
- Polling interval for notification badge updates

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/loi/loi-negotiation-view.tsx` — shared LOI negotiation component (Phase 6) — pattern to replicate for leases
- `src/lib/lease/generate.ts` — mapLoiToLease, calculateEscalationSchedule
- `src/app/(portal)/leases/` — existing broker lease pages
- `src/app/api/leases/` — existing lease CRUD endpoints
- `src/lib/email/notifications.ts` — all notification functions
- `src/lib/email/templates.ts` — email templates including loiSectionUpdate

### Established Patterns
- Per-section negotiation with accept/counter/reject (from LOI)
- Three-party color coding: broker=blue, landlord=amber, tenant=emerald
- In-app notifications via `notifications` table insert
- Email via Resend fire-and-forget

### Integration Points
- Landlord portal layout: add Leases nav item
- Tenant portal layout: add Leases nav item
- Lease detail page: add negotiation view before DocuSign send
- Header component: add notification badge with unread count

</code_context>

<specifics>
## Specific Ideas

- Lease negotiation follows same pattern as LOI — when one party updates, the other two get notified
- All parties must agree before DocuSign is triggered
- In-app notification badge so users know when something needs their attention

</specifics>

<deferred>
## Deferred Ideas

None — final phase of milestone.

</deferred>
