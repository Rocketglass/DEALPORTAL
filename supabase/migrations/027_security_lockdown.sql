-- ============================================================================
-- 027_security_lockdown.sql
--
-- Enterprise-grade RLS lockdown. Goal: NO ONE can read or write the database
-- directly via the public PostgREST/anon key except (a) authenticated portal
-- users acting within their own scope, and (b) the broker/admin. All privileged
-- server work flows through the service-role client, which bypasses RLS and
-- enforces authorization in the API handlers.
--
-- Findings closed (verified 2026-06-06 against prod with the anon key):
--   CRITICAL  email_logs           — no RLS; anon could read all rows (LIVE: 34)
--   CRITICAL  deal_collaborators   — SELECT USING(true) exposed lawyer access_token
--   HIGH      deal_comments        — any authenticated user read/wrote ALL deals
--   MEDIUM    application_reminders — no RLS
--   MEDIUM    loi_templates        — no RLS
--   MEDIUM    inspection_bookings  — public INSERT bypassed the validated API
--
-- All affected tables are written by service-role API routes (verified):
--   email_logs            -> src/lib/email/send.ts, webhooks/resend (service-role)
--   application_reminders -> api/cron/application-reminders (service-role)
--   loi_templates         -> read by broker server client; write by broker
--   deal_collaborators    -> api/deals/.../collaborators + comments (service-role)
--   deal_comments         -> api/deals/.../comments (service-role; session/token authz)
--   inspection_bookings   -> api/properties/[id]/book-inspection (service-role)
-- so tightening RLS does NOT break the portal — service-role bypasses RLS.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. email_logs — enable RLS, broker/admin read only.
--    Writes (send + Resend webhook) use service-role and bypass RLS.
-- ----------------------------------------------------------------------------
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_logs_broker_read ON email_logs;
CREATE POLICY email_logs_broker_read
  ON email_logs
  FOR SELECT
  USING (public.is_broker_or_admin());

-- ----------------------------------------------------------------------------
-- 2. application_reminders — enable RLS, broker/admin read only.
--    Cron writes use service-role and bypass RLS.
-- ----------------------------------------------------------------------------
ALTER TABLE application_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS application_reminders_broker_read ON application_reminders;
CREATE POLICY application_reminders_broker_read
  ON application_reminders
  FOR SELECT
  USING (public.is_broker_or_admin());

-- ----------------------------------------------------------------------------
-- 3. loi_templates — enable RLS. Templates are non-confidential boilerplate, so
--    any authenticated portal user may read; only broker/admin may write.
--    Anonymous (no auth.uid()) is blocked.
-- ----------------------------------------------------------------------------
ALTER TABLE loi_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS loi_templates_auth_read ON loi_templates;
CREATE POLICY loi_templates_auth_read
  ON loi_templates
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS loi_templates_broker_write ON loi_templates;
CREATE POLICY loi_templates_broker_write
  ON loi_templates
  FOR ALL
  USING (public.is_broker_or_admin())
  WITH CHECK (public.is_broker_or_admin());

-- ----------------------------------------------------------------------------
-- 4. deal_collaborators — remove the public USING(true) read that exposed every
--    lawyer's access_token. Broker policy stays; lawyer-by-token reads happen
--    through the service-role comments API (validated in the handler).
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS deal_collaborators_public_read_by_token ON deal_collaborators;

-- ----------------------------------------------------------------------------
-- 5. deal_comments — remove the "any authenticated user" read/insert policies
--    that allowed cross-deal disclosure. Broker policy stays; landlord / tenant
--    / lawyer comment access flows through the service-role comments API, which
--    authorizes by session OR per-deal access_token in the handler.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS deal_comments_auth_read ON deal_comments;
DROP POLICY IF EXISTS deal_comments_auth_insert ON deal_comments;

-- ----------------------------------------------------------------------------
-- 6. inspection_bookings — remove the public INSERT. Bookings are created by the
--    /api/properties/[id]/book-inspection route via service-role (with its own
--    validation + rate limiting), so direct anon PostgREST writes are not needed
--    and should not be allowed. Broker SELECT policy stays.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS bookings_insert ON inspection_bookings;

-- ----------------------------------------------------------------------------
-- NOTE: property_views.views_insert (WITH CHECK true) is intentionally KEPT.
-- Anonymous visitors on the public browse pages log a view via the anon
-- server client, and SELECT is already broker-only so no data is exposed.
-- (Follow-up option: move view logging to a service-role endpoint to remove
--  the last anon-write path entirely.)
-- ----------------------------------------------------------------------------

-- ============================================================================
-- Post-condition: all 32 tables now have RLS enabled. The only remaining
-- anon-accessible paths are intentional public listings (active properties,
-- units, inspection_slots, qr_codes — read-only) and property_views (insert-only
-- analytics). Everything else requires an authorized portal session or the
-- service-role server, satisfying "only portal users or the broker."
-- ============================================================================
