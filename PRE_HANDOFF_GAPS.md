# Pre-Handoff Gap Report — Production E2E Pass

**As of 2026-04-30, against `https://www.rocketrealty.properties`.**

## TL;DR

One critical bug found and fixed (commit `97513f1`). One Vercel env update
needed tomorrow with Rocket. Three minor issues are cosmetic. Everything
else is green.

## 🚨 Critical — fixed, but needs Vercel env change to go live

**Every email the portal sent in the last 30 days was being silently
dropped.** The Resend-verified domain is `rocketrealty.properties` (TLD
`.properties`), but `RESEND_FROM_EMAIL` is set to `notifications@rocketrealty.com`
(TLD `.com`). Resend rejects unverified senders, so emails errored with
*"The rocketrealty.com domain is not verified."*

**Real-world impact** (from `email_logs` table):

| Recipient | What was missed |
|-----------|-----------------|
| `dtorres@ecproperties.com` | Letter of Intent send (4 attempts), LOI Update notifications (3), "LOI Fully Agreed" email — entire 8500 Fletcher Pkwy LOI thread |
| `rocketglass@gmail.com` | 2× invitation emails to landlord portal |
| `rocketglass4@hotmail.com` | "Commission Invoice RR-01" + "LOI Fully Agreed" notifications |
| `neilbajaj72@gmail.com` | application status updates, LOI updates |
| `neil@sersweai.com` | broker notification of new application |

**Fix landed in code** (`97513f1`):
- `src/lib/email/send.ts` fallback default flipped from `.com` → `.properties` (so even if Vercel env is unset, emails still send)
- `src/app/(public)/applications/status/status-client.tsx` — public status page was hardcoded to `(619) 555-0100` and `leasing@rocketrealty.com`. Now reads from `BROKER_CONFIG` (real phone, email).
- `.env.local.example` corrected.

**Still needed in Vercel** — tomorrow with Rocket:
- Set `RESEND_FROM_EMAIL=notifications@rocketrealty.properties` in **Production** scope.
- Save → redeploy.

**Decision for tomorrow:** the 8500 Fletcher Pkwy LOI thread to `dtorres@ecproperties.com` never reached him. If that was a real deal, ask Rocket whether to re-send manually or move on.

## ✅ Confirmed working on production (`www.rocketrealty.properties`)

| Check | Result |
|-------|--------|
| HSTS `max-age=31536000; includeSubDomains` | ✅ |
| CSP, X-Frame DENY, X-Content nosniff, Referrer-Policy, Permissions-Policy | ✅ |
| `robots.txt`, `sitemap.xml` reachable | ✅ |
| Public page response times (TTFB) | ✅ 110ms–1.3s |
| Every route × every persona | ✅ all 200 |
| RLS on every sensitive table | ✅ anon read returns empty |
| Resend domain `rocketrealty.properties` | ✅ verified, region us-east-1 |
| Broker config (DRE, address, phone, Chase wire) | ✅ all real, no placeholders |
| Mobile rendering (`/browse`, `/apply`, `/login` at 375×812) | ✅ no horizontal overflow, all forms readable |
| Auth callback self-healing (orphan auth_provider_id reconciliation) | ✅ landed |
| `/unauthorized` page (was 404 last week) | ✅ landed |

## ⚠ Cosmetic — not blocking, surface tomorrow if there's time

1. **Apex → www redirect.** `https://rocketrealty.properties` 307s to `https://www.rocketrealty.properties`. Every email link, QR code, DocuSign webhook URL hits a redirect first. Not broken, but adds latency. Either change the Vercel domain config so apex serves directly (preferred) or update `NEXT_PUBLIC_APP_URL` in Vercel to the www version.

2. **No real property photos.** `/browse` shows 4 properties; all 4 have placeholder building icons. The portal supports photo upload (broker → property detail → photos panel). Worth a 10-min training session for Rocket to upload real photos so `/browse` looks production-grade to prospects.

3. **`NEXT_PUBLIC_SENTRY_DSN` likely unset in Vercel.** Sentry SDK is wired into the code, but with no DSN it's a no-op — production errors are not captured anywhere outside Vercel's own function logs. Worth setting up a free Sentry project (5 min) and dropping the DSN into Vercel env.

## 📋 Tomorrow's meeting checklist (in order)

While you're already at his computer for DocuSign go-live, knock these out together:

1. **DocuSign go-live** — the original 4 steps from `MEETING_CHECKLIST.md`.
2. **Update `RESEND_FROM_EMAIL`** in Vercel env to `notifications@rocketrealty.properties` (Production scope).
3. **Verify three other env vars are present in Production scope:**
   - `DOCUSIGN_CONNECT_HMAC_SECRET`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. **Discuss the 8500 Fletcher Pkwy LOI** — was that a real deal? If yes, Rocket should know `dtorres@ecproperties.com` never received any email about it.
5. **Bonus** (if time): set up Sentry, decide on apex-vs-www routing, upload first batch of property photos.

## What I'd do the morning after

After the Vercel env flip, visit https://www.rocketrealty.properties/login,
sign in as broker, send a real test invitation to your own email.
Within 30 seconds it should arrive (and `email_logs.status = 'sent'`).
That confirms the production fix took.
