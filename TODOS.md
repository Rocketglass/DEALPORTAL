# TODOS — Rocket Realty Portal

Deferred items from CEO review (2026-03-19). Each item includes full context
so anyone picking it up in 3 months understands the motivation.

---

## P1 — Staging Environment (runbook)

**What:** Create a second Supabase project for dev/staging. Configure Vercel
preview deployments to use the staging database so non-prod code never touches
live tenant/landlord data.

**Why:** The portal runs directly in production with no staging. Database
migrations, API changes, and UI updates go straight to the live system. CRM
development will add significant new tables and modify shared ones — doing
this against production is risky.

**Prerequisite steps (Neil runs these once):**

1. **Create the staging Supabase project.**
   - https://supabase.com/dashboard → New project. Name: `rocket-realty-staging`.
     Region same as prod (US West). Use the free tier.
   - Wait for provisioning, then in the dashboard copy three values:
     - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
     - `anon` / `public` API key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `service_role` key (Settings → API → Service Role) →
       `SUPABASE_SERVICE_ROLE_KEY`

2. **Provision the schema.**
   - From the repo root: `./scripts/bundle-migrations.sh`
     (outputs `supabase/bundled-migrations.sql` — ~2600 lines, gitignored).
   - Open the staging project's SQL editor, paste the bundle, run.
   - Verify: table `invitations` exists, `is_broker_or_admin()` function
     exists, RLS is enabled on `applications`, `leases`, `lois`.

3. **Create the storage buckets.**
   - Storage → Create bucket → `application-documents` (Private)
   - Repeat for `lease-documents`, `property-photos`.
   - Bucket policies are defined in `003_storage_policies.sql` and already
     applied by step 2; confirm they're present under each bucket's Policies
     tab.

4. **Wire Vercel preview deployments to staging.**
   - Vercel → Project → Settings → Environment Variables. Add the three
     Supabase keys above with the scope set to **Preview** only (leave
     Production untouched).
   - Trigger a preview by pushing a branch. The preview URL will use the
     staging project; production still uses the live one.

5. **Smoke-test.**
   - Register a test account on the preview URL.
   - Send yourself an invitation and accept it.
   - Create a throwaway property + unit.
   - Submit a test application.
   - If all four work, staging is live.

**Ongoing:** every new migration under `supabase/migrations/` must be applied
to both projects. Rerunning the bundle script and pasting only the new
sections into staging is the quickest path. A CI step to gate prod
deployments on successful migration apply to staging is a worthy follow-up,
not a blocker.

**Effort:** S (human: ~45 min for the one-time setup)
**Depends on:** Neil's Supabase + Vercel dashboard access. Engineering prep
(bundle script, env-var scaffolding, TODOS runbook) landed in commit that
added `scripts/bundle-migrations.sh`.
**Added by:** /plan-ceo-review on 2026-03-19; runbook fleshed out 2026-04-22.

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
