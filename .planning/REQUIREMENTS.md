# Requirements: Rocket Realty Deal Flow Portal

**Defined:** 2026-03-27
**Core Value:** Compress the time from tenant interest to executed lease by replacing every manual handoff with a single connected digital pipeline where all parties collaborate in-portal.

## v1.1 Requirements

Requirements for Multi-Party Portal milestone. Each maps to roadmap phases.

### Application Flow

- [ ] **APP-01**: QR code leads to a general application page (not property-specific)
- [ ] **APP-02**: Tenant can indicate interest in multiple properties on one application
- [ ] **APP-03**: Tenant can save application progress and return later to complete it
- [ ] **APP-04**: Tenant can submit the application from within the portal

### Roles & Auth

- [x] **ROLE-01**: System supports 6 roles: broker, admin, landlord, landlord_agent, tenant, tenant_agent
- [x] **ROLE-02**: Broker (Rocket) can see all data across all deals and parties
- [ ] **ROLE-03**: Landlord can log into the portal and access their properties' deals
- [ ] **ROLE-04**: Tenant can log into the portal and access their own applications/deals
- [x] **ROLE-05**: Landlord agent can act on behalf of a landlord
- [x] **ROLE-06**: Tenant agent can act on behalf of a tenant
- [ ] **ROLE-07**: Broker can invite landlords, tenants, and agents to the portal

### Landlord Portal

- [ ] **LAND-01**: Landlord can view all applications for their properties
- [ ] **LAND-02**: Landlord can view tenant financial documents (tax returns, bank statements, P&L, business license)
- [ ] **LAND-03**: Landlord can view tenant business information and contact details
- [ ] **LAND-04**: Landlord has a dashboard showing their properties and deal pipeline

### Tenant Portal

- [ ] **TNNT-01**: Tenant can view their own application status and deal progress
- [ ] **TNNT-02**: Tenant can see LOI negotiation status for their deals
- [ ] **TNNT-03**: Tenant can see lease status and signing progress

### LOI Negotiation

- [ ] **LOI-01**: All three parties (broker, landlord, tenant) can view LOI sections in-portal after logging in
- [ ] **LOI-02**: Landlord can accept, counter, or reject LOI sections from their portal
- [ ] **LOI-03**: Tenant can accept, counter, or reject LOI sections from their portal
- [ ] **LOI-04**: When any party updates a section, the other two parties receive notification (email + in-app)
- [ ] **LOI-05**: Broker can see all negotiation history and respond to counters from either party

### Lease Negotiation

- [ ] **LEAS-01**: Lease terms can be reviewed by all three parties in-portal before DocuSign
- [ ] **LEAS-02**: Any party can propose changes to lease terms in-portal
- [ ] **LEAS-03**: When any party updates lease terms, the other parties receive notification
- [ ] **LEAS-04**: Once all parties agree on lease terms, broker can generate PDF and send to DocuSign

### Notifications

- [ ] **NOTF-01**: Email notification sent to all relevant parties when LOI section is updated
- [ ] **NOTF-02**: Email notification sent to all relevant parties when lease term is updated
- [ ] **NOTF-03**: In-app notification badge updates in real-time for logged-in users

## v2 Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Credit Check

- **CRED-01**: Automated credit check via Experian/Equifax API
- **CRED-02**: Credit score auto-populates in application review

### Accounting

- **ACCT-01**: QuickBooks/Xero integration for invoice sync
- **ACCT-02**: Expense tracking and tax-ready reports

## Out of Scope

| Feature | Reason |
|---------|--------|
| Credit check API integration | Client agreed to keep manual upload workflow for now |
| Mobile native app | Web responsive is sufficient for all parties |
| Multi-brokerage support | Single brokerage (Rocket Realty) only |
| Real-time WebSocket updates | Polling + email notifications sufficient for deal velocity |
| Video/photo property tours | Deferred to Website bundle (#3) |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| APP-01 | Phase 4 | Pending |
| APP-02 | Phase 4 | Pending |
| APP-03 | Phase 4 | Pending |
| APP-04 | Phase 4 | Pending |
| ROLE-01 | Phase 3 | Complete |
| ROLE-02 | Phase 3 | Complete |
| ROLE-03 | Phase 3 | Pending |
| ROLE-04 | Phase 3 | Pending |
| ROLE-05 | Phase 3 | Complete |
| ROLE-06 | Phase 3 | Complete |
| ROLE-07 | Phase 3 | Pending |
| LAND-01 | Phase 5 | Pending |
| LAND-02 | Phase 5 | Pending |
| LAND-03 | Phase 5 | Pending |
| LAND-04 | Phase 5 | Pending |
| TNNT-01 | Phase 5 | Pending |
| TNNT-02 | Phase 5 | Pending |
| TNNT-03 | Phase 5 | Pending |
| LOI-01 | Phase 6 | Pending |
| LOI-02 | Phase 6 | Pending |
| LOI-03 | Phase 6 | Pending |
| LOI-04 | Phase 6 | Pending |
| LOI-05 | Phase 6 | Pending |
| LEAS-01 | Phase 7 | Pending |
| LEAS-02 | Phase 7 | Pending |
| LEAS-03 | Phase 7 | Pending |
| LEAS-04 | Phase 7 | Pending |
| NOTF-01 | Phase 7 | Pending |
| NOTF-02 | Phase 7 | Pending |
| NOTF-03 | Phase 7 | Pending |

**Coverage:**
- v1.1 requirements: 30 total
- Mapped to phases: 30
- Unmapped: 0

---
*Requirements defined: 2026-03-27*
*Last updated: 2026-03-27 — traceability populated after roadmap creation*
