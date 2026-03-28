-- Rocket Realty — Invitation System
-- Migration 014: Broker-managed invitations for onboarding landlords, tenants, and agents
--
-- Flow:
--   1. Broker creates invitation via API (inserts row with unique token)
--   2. System sends email with link: /invite?token={token}
--   3. Recipient clicks link, registers/logs in, auth callback reads token
--   4. Auth callback sets user role + contact_id + principal_id from invitation
--   5. Invitation marked as accepted

CREATE TABLE IF NOT EXISTS invitations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token               VARCHAR(64) NOT NULL UNIQUE,
    email               VARCHAR(255) NOT NULL,
    role                VARCHAR(20) NOT NULL,
    contact_id          UUID REFERENCES contacts(id),
    principal_id        UUID REFERENCES users(id),
    deal_id             UUID,
    invited_by          UUID NOT NULL REFERENCES users(id),
    status              VARCHAR(20) NOT NULL DEFAULT 'pending',
    accepted_at         TIMESTAMPTZ,
    accepted_by_user_id VARCHAR(255),
    expires_at          TIMESTAMPTZ NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT invitations_role_check
      CHECK (role IN ('landlord', 'landlord_agent', 'tenant', 'tenant_agent', 'broker')),
    CONSTRAINT invitations_status_check
      CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    CONSTRAINT invitations_agent_principal_check
      CHECK (
        (role IN ('landlord_agent', 'tenant_agent') AND principal_id IS NOT NULL)
        OR role NOT IN ('landlord_agent', 'tenant_agent')
      )
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_invited_by ON invitations(invited_by);

-- RLS for invitations — broker/admin only
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY invitations_select ON invitations
  FOR SELECT USING (
    public.is_broker_or_admin()
  );

CREATE POLICY invitations_insert ON invitations
  FOR INSERT WITH CHECK (
    public.is_broker_or_admin()
  );

CREATE POLICY invitations_update ON invitations
  FOR UPDATE USING (
    public.is_broker_or_admin()
  )
  WITH CHECK (
    public.is_broker_or_admin()
  );

CREATE POLICY invitations_delete ON invitations
  FOR DELETE USING (
    public.is_broker_or_admin()
  );

-- Allow the auth callback to read invitations by token (unauthenticated context).
-- The auth callback uses service-role client, so this policy is for safety.
-- Service-role bypasses RLS, but if we ever switch to anon key:
CREATE POLICY invitations_select_by_token ON invitations
  FOR SELECT USING (
    status = 'pending'
    AND expires_at > NOW()
  );
