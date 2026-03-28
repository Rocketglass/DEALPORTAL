-- Rocket Realty — Multi-Property Applications & Draft Saving
-- Migration 015: Junction table for multi-property interest + server-side draft persistence
--
-- Enables:
--   1. A single application referencing multiple properties (general application flow)
--   2. Authenticated tenants saving/resuming a draft application server-side

-- ============================================================
-- TABLE: application_properties (junction)
-- Links one application to one or more properties
-- ============================================================

CREATE TABLE application_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(application_id, property_id)
);

CREATE INDEX idx_app_props_application ON application_properties(application_id);
CREATE INDEX idx_app_props_property ON application_properties(property_id);

-- RLS
ALTER TABLE application_properties ENABLE ROW LEVEL SECURITY;

-- Broker/admin can do everything
CREATE POLICY app_props_broker_all ON application_properties
  FOR ALL USING (is_broker_or_admin());

-- Tenants can view application_properties rows for their own applications
-- (matched via the application's contact email)
CREATE POLICY app_props_tenant_select ON application_properties
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM applications a
      JOIN contacts c ON c.id = a.contact_id
      WHERE a.id = application_properties.application_id
        AND c.email = get_user_email()
    )
  );

-- ============================================================
-- TABLE: application_drafts
-- One draft per authenticated user — server-side save for
-- the multi-step general application form
-- ============================================================

CREATE TABLE application_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  form_data JSONB NOT NULL DEFAULT '{}',
  selected_property_ids UUID[] DEFAULT '{}',
  current_step INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)  -- one draft per user
);

CREATE INDEX idx_app_drafts_user ON application_drafts(user_id);

-- updated_at trigger
CREATE TRIGGER trg_application_drafts_updated_at
  BEFORE UPDATE ON application_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE application_drafts ENABLE ROW LEVEL SECURITY;

-- Users can only access their own draft
CREATE POLICY app_drafts_own_select ON application_drafts
  FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE auth_provider_id = auth.uid())
  );

CREATE POLICY app_drafts_own_insert ON application_drafts
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM users WHERE auth_provider_id = auth.uid())
  );

CREATE POLICY app_drafts_own_update ON application_drafts
  FOR UPDATE USING (
    user_id = (SELECT id FROM users WHERE auth_provider_id = auth.uid())
  )
  WITH CHECK (
    user_id = (SELECT id FROM users WHERE auth_provider_id = auth.uid())
  );

CREATE POLICY app_drafts_own_delete ON application_drafts
  FOR DELETE USING (
    user_id = (SELECT id FROM users WHERE auth_provider_id = auth.uid())
  );

-- Broker/admin full access (support use case)
CREATE POLICY app_drafts_broker_all ON application_drafts
  FOR ALL USING (is_broker_or_admin());
