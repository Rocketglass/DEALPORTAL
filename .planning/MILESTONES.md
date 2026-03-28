# Milestones

## v1.0 — Deal Flow Portal (Shipped)

**Completed:** 2026-03-16
**Phases:** 1-2 (Foundation + Full Pipeline)

### What Shipped
- Tenant QR portal with property browsing and multi-step application
- Broker dashboard with pipeline analytics and property management
- Application review with financial document viewer
- LOI builder with AI-drafted sections and 4 property-type templates
- Section-by-section landlord negotiation (via public review page)
- Lease generation from agreed LOI with AIR form auto-population
- DocuSign e-signature integration with webhook status tracking
- Auto commission invoice generation on lease execution
- 11 email notification types
- Rate limiting, CSRF, CSP, RLS, audit logging
- QR code generation with scan tracking
- Daily cron for application follow-up reminders

### Post-Ship Fixes (2026-03-27)
- QA: Fixed 9 issues (rate limiting, mobile responsive, CSP, Recharts, UUID display, landlord empty state)
- Pipeline gaps: Wired invoice notification, info_requested email, tenant status tracker with LOI/lease progress, LOI template integration
