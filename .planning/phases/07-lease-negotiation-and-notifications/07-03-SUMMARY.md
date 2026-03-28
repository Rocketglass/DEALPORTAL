---
phase: 07-lease-negotiation-and-notifications
plan: "03"
subsystem: lease-negotiation-ui
tags: [lease, negotiation, ui, landlord-portal, tenant-portal, pdf, docusign]
dependency_graph:
  requires: [07-01]
  provides: [landlord-lease-detail-page, tenant-lease-detail-page, lease-negotiation-component]
  affects: [landlord-portal-nav, tenant-portal-nav]
tech_stack:
  added: []
  patterns: [shared-negotiation-component, three-party-timeline, per-section-submit, broker-actions-card]
key_files:
  created:
    - src/components/lease/lease-negotiation-view.tsx
    - src/app/(landlord)/landlord/leases/[id]/page.tsx
    - src/app/(tenant)/tenant/leases/[id]/page.tsx
  modified:
    - src/app/(landlord)/landlord/layout.tsx
    - src/app/(tenant)/tenant/layout.tsx
decisions:
  - "Sections displayed in display_order from API (not alphabetically sorted like LOI view) — matches lease section ordering intent"
  - "requireRole used in lease detail pages instead of requireAuth — consistent with existing LOI page pattern and provides role validation"
  - "BrokerActionsCard generates PDF with blob URL opened in new tab — matches existing generate-pdf route returning application/pdf bytes"
  - "Send to DocuSign button disabled until PDF has been generated in the current session — prevents accidental sends before PDF is confirmed"
metrics:
  duration: 3 min
  completed_date: "2026-03-28"
  tasks_completed: 2
  files_created: 3
  files_modified: 2
---

# Phase 7 Plan 3: Lease Negotiation UI (Landlord/Tenant Portals) Summary

Shared `LeaseNegotiationView` component for lease section negotiation wired into landlord and tenant portals, with broker-only Generate PDF + Send to DocuSign actions when all terms are agreed.

## What Was Built

**Task 1: LeaseNegotiationView component** (`src/components/lease/lease-negotiation-view.tsx`)

Replicates the `LoiNegotiationView` pattern exactly adapted for leases:
- Fetches `GET /api/leases/{id}/negotiate` and maps timeline entries onto sections by `sectionId`
- Sections displayed in `display_order` from the API (not alphabetically sorted)
- Per-section accept/counter/reject buttons with individual submit and immediate refetch
- Counter textarea and reject reason textarea with per-section `Submit Response` button
- Three-party timeline history (broker=blue #1e40af, landlord=amber-500, tenant=emerald-500)
- Progress sidebar with status counts (accepted/countered/pending/rejected), progress bar, and party legend
- `BrokerActionsCard` shown when `meta.negotiationStatus === 'agreed'` and `callerRole` is broker/admin:
  - "Generate PDF" POSTs to `/api/leases/{id}/generate-pdf`, opens blob URL in new tab, marks PDF generated
  - "Send to DocuSign" POSTs to `/api/leases/{id}/send-for-signing`, disabled until PDF is generated
  - Loading spinners, success states, and error messages for both buttons
- Dynamic section icons based on `sectionKey` patterns (DollarSign for rent/cam, Calendar for term/dates, Shield for deposit, FileCheck for all others)

**Task 2: Portal pages and nav updates** (4 files)

- `src/app/(landlord)/landlord/leases/[id]/page.tsx` — server component with `requireRole('landlord', 'landlord_agent', 'broker', 'admin')`, BackButton, renders `LeaseNegotiationView` with `portalBasePath="/landlord/leases"`
- `src/app/(tenant)/tenant/leases/[id]/page.tsx` — server component with `requireRole('tenant', 'tenant_agent', 'broker', 'admin')`, BackButton, renders `LeaseNegotiationView` with `portalBasePath="/tenant/leases"`
- `src/app/(landlord)/landlord/layout.tsx` — added `ScrollText` import and `{ href: '/landlord/leases', label: 'Leases', icon: ScrollText }` nav item after LOIs
- `src/app/(tenant)/tenant/layout.tsx` — added `ScrollText` import and `{ href: '/tenant/leases', label: 'Leases', icon: ScrollText }` nav item after LOIs

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files confirmed created:
- `src/components/lease/lease-negotiation-view.tsx` — exists
- `src/app/(landlord)/landlord/leases/[id]/page.tsx` — exists
- `src/app/(tenant)/tenant/leases/[id]/page.tsx` — exists

Commits confirmed:
- `b057066` — feat(07-03): create shared LeaseNegotiationView component
- `1af9631` — feat(07-03): add landlord/tenant lease pages and portal nav updates

TypeScript: zero errors on `npx tsc --noEmit`
