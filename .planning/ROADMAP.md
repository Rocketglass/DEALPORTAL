# Roadmap: Rocket Realty Deal Flow Portal

## Milestones

- ✅ **v1.0 Deal Flow Portal** — Phases 1-2 (shipped 2026-03-16)
- 🚧 **v1.1 Multi-Party Portal** — Phases 3-7 (in progress)

## Phases

<details>
<summary>✅ v1.0 Deal Flow Portal (Phases 1-2) — SHIPPED 2026-03-16</summary>

### Phase 1: Foundation
**Goal**: Core infrastructure, auth, and data model in place
**Plans**: Complete

### Phase 2: Full Pipeline
**Goal**: End-to-end deal flow from tenant application through signed lease and invoice
**Plans**: Complete

</details>

---

### 🚧 v1.1 Multi-Party Portal (In Progress)

**Milestone Goal:** Transform the portal from a broker-centric tool with public tenant/landlord pages into a true multi-party platform where broker, landlord, and tenant all have authenticated access and can collaborate on LOI and lease negotiation in-portal.

- [ ] **Phase 3: Role Foundation** — Expand the auth system to support all six roles with RLS policies and broker-managed invitations
- [x] **Phase 4: General Application Flow** — Allow tenants to apply without a specific property and save progress (completed 2026-03-28)
- [ ] **Phase 5: Landlord and Tenant Portals** — Give both party types authenticated dashboards with deal visibility
- [ ] **Phase 6: In-Portal LOI Negotiation** — All three parties negotiate LOI sections inside the portal with full history and notifications
- [ ] **Phase 7: Lease Negotiation and Notifications** — All three parties negotiate lease terms in-portal before DocuSign; complete notification layer wired across all negotiation events

## Phase Details

### Phase 3: Role Foundation
**Goal**: All six roles exist in the system, each role sees only what it should see, and brokers can invite landlords, tenants, and agents into the portal
**Depends on**: Phase 2 (v1.0 ships)
**Requirements**: ROLE-01, ROLE-02, ROLE-03, ROLE-04, ROLE-05, ROLE-06, ROLE-07
**Success Criteria** (what must be TRUE):
  1. A user can be assigned any of the six roles (broker, admin, landlord, landlord_agent, tenant, tenant_agent) and RLS enforces the correct data access for each
  2. Broker can see all deals and parties across the entire system with no access gaps
  3. Landlord and landlord_agent accounts can log in and reach their portal; tenant and tenant_agent accounts can log in and reach their portal
  4. Broker can send an invitation to a landlord, tenant, or agent and that person can create an account linked to the correct role and associated deal
  5. Landlord agents can act on behalf of their landlord; tenant agents can act on behalf of their tenant
**Plans:** 3/4 plans executed

Plans:
- [x] 03-01-PLAN.md — Schema migration: expand to 6 roles, add principal_id for agent delegation, update RLS policies
- [x] 03-02-PLAN.md — Auth guards + middleware: role-aware routing, new guard functions, invitation-aware auth callback
- [x] 03-03-PLAN.md — Invitation system: invitations table, API endpoints, email sending
- [ ] 03-04-PLAN.md — (TBD)

### Phase 4: General Application Flow
**Goal**: Tenants can apply without needing a property-specific QR code, indicate interest in multiple properties, and save their progress to finish later
**Depends on**: Phase 3
**Requirements**: APP-01, APP-02, APP-03, APP-04
**Success Criteria** (what must be TRUE):
  1. Scanning a QR code (or visiting the portal directly) leads to a general application page that is not locked to one property
  2. A tenant can select multiple properties they are interested in within a single application
  3. A tenant can save their in-progress application, log out, return later, and continue from where they left off
  4. A tenant can submit the completed application from within their portal dashboard
**Plans:** 2/2 plans complete

Plans:
- [ ] 04-01-PLAN.md — Schema + API: application_properties junction table, application_drafts table, properties list endpoint, draft save/load API
- [ ] 04-02-PLAN.md — Unified apply page: multi-property selector, server-side draft sync, auth-gated submission, QR redirect update

### Phase 5: Landlord and Tenant Portals
**Goal**: Both landlords and tenants have authenticated dashboards that show their relevant deals, documents, and deal status — replacing the current public unauthenticated pages
**Depends on**: Phase 3
**Requirements**: LAND-01, LAND-02, LAND-03, LAND-04, TNNT-01, TNNT-02, TNNT-03
**Success Criteria** (what must be TRUE):
  1. Landlord logs in and sees a dashboard listing their properties and the deal pipeline for each (replacing the public /loi/[id]/review page)
  2. Landlord can open any application and view the tenant's financial documents, business information, and contact details
  3. Tenant logs in and sees the current status of their application including which stage the deal is at
  4. Tenant can see the current LOI negotiation status and which sections are agreed, countered, or pending
  5. Tenant can see the lease status and DocuSign signing progress for their deal
**Plans:** 1/3 plans executed

Plans:
- [ ] 05-01-PLAN.md — Shared portal layout infrastructure: PortalSidebar component, landlord and tenant route group layouts
- [ ] 05-02-PLAN.md — Landlord portal: dashboard with properties/pipeline, applications list, application detail with financial doc viewer
- [ ] 05-03-PLAN.md — Tenant portal: dashboard with application status, LOI section-level progress, lease/signing status

### Phase 6: In-Portal LOI Negotiation
**Goal**: All three parties (broker, landlord, tenant) can view, counter, accept, and reject LOI sections from inside the portal — with full negotiation history visible to each party
**Depends on**: Phase 5
**Requirements**: LOI-01, LOI-02, LOI-03, LOI-04, LOI-05
**Success Criteria** (what must be TRUE):
  1. Any logged-in party (broker, landlord, tenant) can open the LOI and see all sections and their current status
  2. Landlord can counter, accept, or reject any LOI section from their portal; their action is recorded in negotiation history
  3. Tenant can counter, accept, or reject any LOI section from their portal; their action is recorded in negotiation history
  4. When any party updates a section, the other two parties each receive an email notification and an in-app notification badge
  5. Broker can view the complete negotiation history across both parties and respond to any outstanding counter from either side
**Plans**: TBD

### Phase 7: Lease Negotiation and Notifications
**Goal**: All three parties can review and propose changes to lease terms in-portal before DocuSign; once all parties agree, broker sends to DocuSign; the full notification layer is complete across all LOI and lease events
**Depends on**: Phase 6
**Requirements**: LEAS-01, LEAS-02, LEAS-03, LEAS-04, NOTF-01, NOTF-02, NOTF-03
**Success Criteria** (what must be TRUE):
  1. Any logged-in party can open the lease and review all terms before DocuSign is triggered
  2. Any party can propose a change to a lease term in-portal; the proposed change is visible to all parties with attribution
  3. When any party updates a lease term, the other two parties each receive an email notification and an in-app notification badge updates without a page reload
  4. When all parties have agreed on lease terms, the broker can generate the PDF and send it to DocuSign from the portal
  5. Email notifications fire correctly for both LOI section updates and lease term updates, referencing the correct parties and deal

**Plans**: TBD

## Progress

**Execution Order:** 3 → 4 → 5 → 6 → 7

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | — | Complete | 2026-03-16 |
| 2. Full Pipeline | v1.0 | — | Complete | 2026-03-16 |
| 3. Role Foundation | 1/3 | In Progress|  | - |
| 4. General Application Flow | 2/2 | Complete   | 2026-03-28 | - |
| 5. Landlord and Tenant Portals | 1/3 | In Progress|  | - |
| 6. In-Portal LOI Negotiation | v1.1 | 0/TBD | Not started | - |
| 7. Lease Negotiation and Notifications | v1.1 | 0/TBD | Not started | - |

---
*Roadmap created: 2026-03-27 for v1.1 Multi-Party Portal*
*v1.0 shipped: 2026-03-16*
