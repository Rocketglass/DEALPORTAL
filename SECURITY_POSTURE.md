# Rocket Realty Portal — Security Posture

What is enterprise-grade today, what is "good enough for SMB CRE
brokerage", and what would need more work for true enterprise (SOC 2,
multi-tenant SaaS, regulated industry).

## Threat model

Three sensitive asset classes:

1. **Tenant PII + financials** — applications include tax returns, bank
   statements, P&L. Stored in private Supabase Storage, signed URLs
   only, RLS-scoped.
2. **Lease + LOI documents** — legally binding once signed; private
   bucket; signed by DocuSign; webhook HMAC-verified.
3. **Commission invoices** — financial records, broker-only access.

Likely attackers:

- Casual: someone guesses URLs, tries to read another tenant's docs.
- Phishing-style: someone gets a real recipient to click a malicious
  link or compromises an email account.
- Insider: a logged-in landlord tries to see another landlord's deal.
- Bot scraper: scrapes property listings or harvests emails.

## What is enterprise-grade today

### Authentication & session

- ✅ **Server-side enforcement**. Every protected route runs a Server
  Component or middleware that calls `requireAuthForApi` /
  `requireRole` — never trusts client-side state.
- ✅ **Self-healing auth↔public.users link** (`src/app/auth/callback/route.ts`):
  if Supabase Auth deletes/recreates an auth user, the next sign-in
  reconciles the existing public.users row by email rather than
  silently locking the account out.
- ✅ **Role-aware redirect**. Tenant hits broker route → bounced to
  tenant dashboard, not just 401. `/unauthorized` page renders for
  role mismatches (was a 404 before commit `e6abecd`).
- ✅ **Password reset** with Supabase recovery flow, redirects to
  `/auth/reset-password`.

### Authorization

- ✅ **RLS on every sensitive table**: applications, application_documents,
  contacts, lois, loi_sections, leases, lease_sections,
  commission_invoices, invitations, audit_log, notifications,
  deal_collaborators, properties, units, users. Anon key cannot read
  any of them.
- ✅ **Ownership scoping** for tenants and landlords via
  `principalContactId` (an agent's principal's contact, computed by
  `auth-guard.ts` so call sites never need to remember the
  user-id-vs-contact-id distinction).
- ✅ **Role-change endpoint hardening**: `PATCH /api/users/[id]/role`
  now refuses to set agent roles without a principal_id; the inline
  role dropdown filters out agent roles for the same reason.

### Network & transport

- ✅ **HTTPS everywhere**. HSTS `max-age=31536000; includeSubDomains`
  on production www host.
- ✅ **CSP** — strict directives, only `'self'` + Supabase project URL
  + Google Maps allowed. `frame-ancestors 'none'` blocks clickjacking.
  `'unsafe-inline'` and `'unsafe-eval'` are present in `script-src`
  (needed for Next.js bootstrap + dev-mode HMR; tightening to
  nonce-based CSP is a future enhancement).
- ✅ **X-Frame-Options DENY**, X-Content-Type-Options nosniff,
  Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy
  locking down camera/mic/geo/payment/usb/sensors.
- ✅ **CSRF** — Origin/Referer validated on every state-changing
  request in middleware (`validateCsrf`).
- ✅ **Rate limiting** — Upstash Redis, three tiers: 10/min on auth,
  30/min on public APIs, 100/min general. Falls back to "allow if not
  configured" rather than failing closed (deliberate: don't lock users
  out if Upstash has an outage), but Vercel env should always have it
  in prod.

### Webhooks

- ✅ **DocuSign Connect**: HMAC-SHA256, constant-time comparison via
  XOR mask, returns 401 on bad signature, fails closed in production
  if the secret is unset.
- ✅ **Resend**: Svix-style HMAC, anti-replay (5-minute timestamp
  window), `timingSafeEqual` constant-time comparison, multiple
  signature support. Always returns 200 to prevent retry storms but
  only after rejecting bad sigs.

### File handling

- ✅ **Private storage** for `application-documents` and
  `lease-documents`. All access via signed URLs (5–15 min expiry).
- ✅ **`property-photos` is intentionally public** — used in marketing
  flyers shown to anonymous visitors.
- ✅ **PDF magic-byte check** on lease upload (`/api/leases/[id]/upload-pdf`):
  the first four bytes must be `%PDF`, regardless of the
  Content-Type header.
- ✅ **Size cap** on lease upload (25 MB — DocuSign's per-document
  limit).

### Error handling & observability

- ✅ **No information leakage**: every API route returns generic
  `Internal server error` on 500. Curated auth messages are still
  surfaced (`Unauthorized: …`, `Forbidden: …`). Full errors logged
  server-side.
  *Landed in commit `f312b3f` after a sweep of 52 routes / 71
  individual responses.*
- ✅ **Audit log** records lease execution, document views, role
  changes, AI-drafted LOIs, invoice generation. Useful for forensic
  investigation.
- ⚠ **Sentry**: SDK is wired in but `NEXT_PUBLIC_SENTRY_DSN` may not
  be set in Vercel env. Without it, client-side exceptions vanish.
  Setting up a Sentry project (free tier) takes 5 minutes.

### Data integrity

- ✅ **5/5 active users have valid auth links**. The earlier orphan
  rocketglass@gmail.com row (auth_provider_id mismatch) is fixed.
  Self-healing callback prevents recurrence.
- ✅ **Test fixtures cleanup**. The `scripts/pipeline-e2e.mjs`
  test harness tags everything `TEST_E2E_*` and cleans up after each
  run; service-role queries can sweep stragglers.

## What is good enough for SMB CRE — but not enterprise

These are deliberate trade-offs. Going further is real engineering work
and the value depends on Rocket's risk appetite and growth.

| Area | Current | Enterprise target |
|------|---------|-------------------|
| **MFA** | Not enforced. Available via Supabase Dashboard → Auth → MFA. | Required for broker/admin. |
| **Password policy** | Default Supabase (min 6 chars). | Min 12, complexity, leaked-password check. |
| **Login throttling** | Rate-limited at 10/min via Upstash, but no per-account lockout. | Account lockout after N failures + alert. |
| **Session timeout** | Supabase default (long-lived refresh token). | Idle timeout + max-session-lifetime. |
| **Email verification** | Confirmation email is sent on registration; verification is enforced by the auth callback (no users row until confirmed). | Same; possibly add re-confirmation on sensitive actions. |
| **PII in server logs** | A handful of server-side `console` lines include `user.email` for debugging role-mismatch / pending-user events. Log destination is Vercel function logs, accessible only to the team. | Hash or omit emails; structured logging with explicit PII fields. |
| **CSP `unsafe-inline` / `unsafe-eval`** | Present in `script-src` for Next.js HMR and inline bootstrap; in `style-src` for Tailwind/styled-jsx. | Nonce-based CSP. Significant refactor; high effort, low ROI for current scale. |
| **Backup / DR** | Relies on Supabase Pro nightly backups + Vercel deployments are immutable. No tested restore drill. | Documented RTO/RPO, quarterly restore drill. |
| **Dependency CVE scanning** | None automated. | Dependabot or Snyk + CI gate. |
| **Secret rotation** | Manual. | Quarterly rotation policy + automation. |
| **Penetration test** | Not performed. | Annual third-party pentest. |

## Rocket's pre-go-live checklist (Supabase Auth dashboard)

While you and Rocket are on his Vercel/DocuSign tomorrow, also visit
**https://supabase.com/dashboard → project → Authentication** and:

1. **Settings → Auth Settings**
   - **Enable email confirmations** ✓ — required (default on; verify it's still on)
   - **Site URL:** `https://www.rocketrealty.properties`
   - **Redirect URLs:** add `https://www.rocketrealty.properties/auth/callback` and `https://rocketrealty.properties/auth/callback`

2. **Settings → Auth → Password Policy**
   - Min length: at least **10** (default 6 is weak for a financial platform)
   - Require: lowercase, uppercase, number, symbol — pick at least 3 of 4

3. **Settings → Auth → Multi-Factor Authentication**
   - **Enable TOTP**. Once enabled, broker and admin accounts can opt
     in via Settings → Security in the portal (we'd add that UI later
     if MFA is enforced).

4. **Settings → Auth → Attack Protection**
   - **Enable "Prevent use of leaked passwords"** — checks new
     passwords against the HaveIBeenPwned database (free).
   - **Enable rate limiting** at the project level (50 requests/sec
     default is fine).

5. **Settings → Auth → Email Templates**
   - Update sender name from "Supabase" to "Rocket Realty Portal" if
     not already done.
   - Customize the confirmation, magic link, and password reset
     templates with Rocket's branding.

## Pre-meeting checklist (consolidated)

In order of priority, while in person tomorrow:

1. **DocuSign go-live** — see `MEETING_CHECKLIST.md` for the original
   four steps.
2. **Vercel env: `RESEND_FROM_EMAIL`** → `notifications@rocketrealty.properties`
   (was `.com`; this dropped 22 real emails over 30 days).
3. **Vercel env: confirm present in Production scope:**
   - `DOCUSIGN_CONNECT_HMAC_SECRET`
   - `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
   - `NEXT_PUBLIC_SENTRY_DSN` (set up if absent — free tier)
   - `CRON_SECRET` (for the daily reminder cron — fails closed if unset)
4. **Supabase Auth dashboard** — five steps above.
5. **Vercel domain config** — apex `rocketrealty.properties` currently
   307s to `www.`. Either flip the redirect direction (preferred) or
   change `NEXT_PUBLIC_APP_URL` to the www form. One redirect on
   every QR/email link is not broken, just suboptimal.
6. **Decide on the dropped 8500 Fletcher Pkwy LOI thread**
   (`dtorres@ecproperties.com` never received nine emails). Re-send
   manually if the deal was real.

## Verification scripts left in the repo

| Command | What it does |
|---------|--------------|
| `node scripts/persona-smoke.mjs` | sign in as each persona, hit every gated route |
| `BASE_URL=https://www.rocketrealty.properties node scripts/persona-smoke.mjs` | same against production |
| `node scripts/pipeline-e2e.mjs` | walks a tagged test deal through application → LOI → review token, with cleanup |
| `node scripts/prod-readiness-audit.mjs` | env, security headers, RLS, storage, files |
| `node scripts/authz-audit.mjs` | enumerate methods + auth guards across all 74 API routes |
| `node scripts/sanitize-500-errors.mjs` | re-run the codemod that sanitized 500-response messages |

## Confidence

Green to hand off this week. The portal is **enterprise-grade in the
most important areas** for a financial document workflow:
authentication enforcement, RLS, webhook signature verification, file
handling, security headers, error sanitization. The remaining items
are either **trade-offs SMBs accept** (CSP nonces, server-log PII) or
**operational policy** rather than code (MFA enforcement, pentest).
