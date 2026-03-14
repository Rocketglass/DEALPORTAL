-- Rocket Realty Deal Flow Portal — Tighten Registration Security
-- Migration 004: Enforce 'pending' role pattern for new registrations
--
-- SECURITY MODEL:
--   New self-registrations get role='pending' in the auth callback.
--   The 'pending' role is deliberately NOT included in is_broker_or_admin(),
--   so RLS blocks all portal data access for pending users automatically.
--   An admin must manually promote a user to 'broker' or 'admin' to grant access.
--
-- Roles:
--   - 'admin'   : Developer (Neil @ SersweAI) — full access
--   - 'broker'  : Rocket Glass — full access to deal pipeline
--   - 'pending' : Newly registered users — no data access until promoted
--   - 'tenant'  : Prospective tenants — limited to own data
--   - 'landlord': Property owners — limited to LOIs sent to them
--

-- ============================================================
-- Re-create is_broker_or_admin() with explicit documentation
-- (Logic unchanged — 'pending' was never included — but adding
-- clarity that this is intentional, not an oversight.)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_broker_or_admin()
RETURNS BOOLEAN AS $$
  -- Only 'broker' and 'admin' roles have portal data access.
  -- 'pending' users are intentionally excluded — they must be
  -- promoted by an admin before they can access any data.
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_provider_id = auth.uid()::TEXT
    AND is_active = true
    AND role IN ('broker', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- Add a CHECK constraint on the role column to enforce valid values.
-- This prevents accidental insertion of unexpected role strings.
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_role_check
      CHECK (role IN ('admin', 'broker', 'pending', 'tenant', 'landlord'));
  END IF;
END $$;

-- ============================================================
-- Allow newly registered users to insert their own row.
-- The auth callback upserts a row with role='pending' right after
-- account creation. The existing users_insert_admin policy only
-- allows admin inserts, so we need a self-registration policy.
-- ============================================================
CREATE POLICY users_insert_self ON public.users
  FOR INSERT WITH CHECK (
    -- The user can only insert a row for themselves
    auth_provider_id = auth.uid()::TEXT
    -- And they can only set 'pending' role (not escalate to broker/admin)
    AND role = 'pending'
  );
