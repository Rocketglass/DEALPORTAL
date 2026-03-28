# Rocket Realty Deal Flow Portal

## What This Is

A web-based platform that digitizes the entire commercial real estate transaction lifecycle for Rocket Realty — from tenant discovery through commission collection. Serves three party types: brokers (Rocket), landlords and their agents, and tenants and their agents. Built on Next.js 16.1 with Supabase, DocuSign, and Resend.

## Core Value

Compress the time from tenant interest to executed lease by replacing every manual handoff (paper applications, emailed Word docs, printed lease forms, hand-built invoices) with a single connected digital pipeline where all parties collaborate in-portal.

## Requirements

### Validated

<!-- Shipped in v1.0 and confirmed working. -->

- [x] Tenant can scan QR code and browse property listings
- [x] Tenant can submit multi-step application with financial document uploads
- [x] Broker dashboard with pipeline analytics, vacancy intelligence, charts
- [x] Broker can review applications, approve/reject, manage review notes
- [x] Broker can create LOIs with AI-drafted sections from application data
- [x] LOI section-by-section negotiation (broker → landlord via email link)
- [x] Lease generation from agreed LOI terms with AIR form auto-population
- [x] DocuSign e-signature integration with webhook-based status tracking
- [x] Auto commission invoice generation on lease execution
- [x] 11 email notification types at every status transition
- [x] QR code generation with scan tracking and analytics
- [x] Property management with unit tracking
- [x] Market comps tracking
- [x] Settings (profile, commission defaults, branding, integrations)
- [x] Rate limiting, CSRF, CSP, RLS, audit logging

### Active

<!-- v1.1 Multi-Party Portal -->

- [ ] General application flow (not property-specific, multi-property interest)
- [ ] Three-party role system (broker, landlord+agent, tenant+agent)
- [ ] Landlord portal login with access to tenant info and financial docs
- [ ] Tenant portal login with deal progress tracking
- [ ] Bidirectional LOI negotiation in-portal (all parties authenticated)
- [ ] Bidirectional lease negotiation in-portal (before DocuSign)
- [ ] Real-time notifications when any party updates LOI or lease terms

### Out of Scope

- Credit check API integration (Experian/Equifax) — keep manual upload workflow
- Mobile native app — web responsive is sufficient
- Multi-brokerage support — single brokerage (Rocket Realty) only
- Accounting integrations (QuickBooks, Xero) — deferred to Bundle #5

## Current Milestone: v1.1 Multi-Party Portal

**Goal:** Transform the portal from a broker-centric tool with public tenant/landlord pages into a true multi-party platform where all three deal participants (broker, landlord, tenant) have authenticated portal access and can collaborate on LOI and lease negotiation in real-time.

**Target features:**
- QR code → general application (not property-specific)
- Expanded role system: broker, admin, landlord, landlord_agent, tenant, tenant_agent
- Landlord dashboard: see tenant applications, financial docs, negotiate LOI/lease
- Tenant dashboard: track application + deal progress, participate in negotiations
- Bidirectional LOI negotiation: any party can counter/accept/reject, all others notified
- Lease term negotiation in-portal before DocuSign send
- Agent delegation: landlord agents and tenant agents can act on behalf of principals

## Context

- **Client:** Rocket Glass, CCIM — commercial real estate broker in San Diego East County
- **Scale:** ~25 tenants, 69,477 SF, ~$104K/month rent, a few deals per month
- **Live at:** https://rocket-realty-portal.vercel.app
- **Stack:** Next.js 16.1 (App Router), Supabase (Postgres + Auth + Storage + RLS), Vercel, DocuSign, Resend, Upstash Redis, pdf-lib, Recharts, Vitest
- **v1.0 shipped:** Full broker dashboard, tenant application flow, one-way LOI negotiation, lease generation, DocuSign, auto invoicing
- **Key change in v1.1:** The landlord LOI review is currently a public unauthenticated page (accessed via email link). This needs to become an authenticated portal experience. Similarly, tenants currently only interact via public pages — they need a logged-in dashboard.

## Constraints

- **Tech stack**: Must stay on existing Next.js + Supabase stack — no new infrastructure
- **Auth**: Supabase Auth handles all authentication — extend roles, don't replace
- **RLS**: All data access must go through Supabase Row Level Security policies
- **Backward compatibility**: Existing broker workflows must continue working
- **Single codebase**: All three portals (broker, landlord, tenant) served from same Next.js app

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase for DB + Auth + Storage | Free tier covers scale, single platform | ✓ Good |
| Next.js App Router | Single codebase serves all portals | ✓ Good |
| DocuSign for e-signatures | Client already uses it, industry standard | ✓ Good |
| QR → general application (v1.1) | Deals don't always start with a specific property | — Pending |
| Three-party portal access (v1.1) | Both LOI and lease negotiation must be in-portal with notifications | — Pending |

---
*Last updated: 2026-03-27 after v1.1 milestone started*
