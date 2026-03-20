# TODOS — Rocket Realty Portal

Deferred items from CEO review (2026-03-19). Each item includes full context
so anyone picking it up in 3 months understands the motivation.

---

## P1 — Staging Environment

**What:** Create a second Supabase project for dev/staging. Configure Vercel preview
deployments to use the staging database.

**Why:** The portal runs directly in production with no staging. Database migrations,
API changes, and UI updates go straight to the live system that Rocket's tenants and
landlords use. CRM development will add significant new tables and modify shared
ones — doing this against production is risky.

**Pros:** Safe CRM development, migration testing before production, ability to
demo features to client before going live.

**Cons:** Minimal — Supabase offers a second free project. Vercel preview deployments
are built-in.

**Context:** The architecture plan already mentions using Supabase's second free
project for staging. This TODO tracks actually setting it up. Should be done before
CRM Phase 2A begins.

**Effort:** S (human: 1 day / CC: 15 min)
**Depends on:** CRM build starting
**Added by:** /plan-ceo-review on 2026-03-19

---

## P2 — Credit Check API (Experian)

**What:** Integrate the Experian Business Credit API for one-click credit pulls
from the application review screen.

**Why:** Currently, Rocket runs credit checks through a separate process and
manually uploads the PDF report. API integration saves 5-10 minutes per
application review.

**Pros:** One-click credit check from dashboard. Score auto-populated in
application record. Report PDF auto-stored.

**Cons:** Experian requires an application process and approval — external
dependency with unknown timeline. API costs ~$5-15 per pull.

**Context:** The architecture plan included this integration. The API route
shell exists at `/api/applications/[id]/credit-check/route.ts` with manual
upload fallback. The manual fallback works and is being used. This is an
enhancement, not a blocker.

**Effort:** M (human: 1 week / CC: 30 min)
**Depends on:** Experian API application and approval
**Added by:** /plan-ceo-review on 2026-03-19
