-- Deal collaborators (lawyer access) and deal comments.
-- Enables per-deal lawyer invite with view + comment access for LOIs and leases.

-- ============================================================
-- deal_collaborators
-- ============================================================

CREATE TABLE deal_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_type TEXT NOT NULL CHECK (deal_type IN ('loi', 'lease')),
  deal_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('landlord_lawyer', 'tenant_lawyer')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  access_token VARCHAR(64) NOT NULL UNIQUE,
  invited_by UUID NOT NULL,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ
);

CREATE INDEX idx_deal_collaborators_deal ON deal_collaborators (deal_type, deal_id);
CREATE INDEX idx_deal_collaborators_token ON deal_collaborators (access_token);

COMMENT ON TABLE deal_collaborators IS 'Invited lawyers with view + comment access to specific LOIs or leases';
COMMENT ON COLUMN deal_collaborators.access_token IS 'Unique token used in review URLs for lawyer authentication';
COMMENT ON COLUMN deal_collaborators.revoked_at IS 'Set when broker revokes access; NULL while active';

-- RLS
ALTER TABLE deal_collaborators ENABLE ROW LEVEL SECURITY;

-- Broker / admin can do anything
CREATE POLICY deal_collaborators_broker_all
  ON deal_collaborators
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_provider_id = auth.uid()::text
        AND u.role IN ('broker', 'admin')
        AND u.is_active = true
    )
  );

-- Public read by token (for lawyer access via access_token lookup)
CREATE POLICY deal_collaborators_public_read_by_token
  ON deal_collaborators
  FOR SELECT
  USING (true);

-- ============================================================
-- deal_comments
-- ============================================================

CREATE TABLE deal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_type TEXT NOT NULL CHECK (deal_type IN ('loi', 'lease')),
  deal_id UUID NOT NULL,
  section_id UUID,
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL,
  author_role TEXT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deal_comments_deal ON deal_comments (deal_type, deal_id);

COMMENT ON TABLE deal_comments IS 'Comments on LOI / lease deals from brokers, landlords, tenants, and lawyers';

-- RLS
ALTER TABLE deal_comments ENABLE ROW LEVEL SECURITY;

-- Broker / admin full access
CREATE POLICY deal_comments_broker_all
  ON deal_comments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_provider_id = auth.uid()::text
        AND u.role IN ('broker', 'admin')
        AND u.is_active = true
    )
  );

-- Authenticated users (landlord, tenant) can read and insert
CREATE POLICY deal_comments_auth_read
  ON deal_comments
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY deal_comments_auth_insert
  ON deal_comments
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Service role (for lawyer comments via API) bypasses RLS automatically
