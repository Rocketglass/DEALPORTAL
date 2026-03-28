-- Rocket Realty Deal Flow Portal — Role Expansion
-- Migration 013: Expand from 4 roles to 6 roles with agent delegation
--
-- 6-ROLE MODEL:
--   - 'admin'         : Developer (Neil @ SersweAI) — full access
--   - 'broker'        : Rocket Glass — full access to deal pipeline
--   - 'landlord'      : Property owners — access to their own LOIs/leases
--   - 'landlord_agent': Agent acting on behalf of a landlord principal
--   - 'tenant'        : Prospective tenants — access to their own data
--   - 'tenant_agent'  : Agent acting on behalf of a tenant principal
--   - 'pending'       : Newly registered (no access until promoted)
--
-- AGENT DELEGATION PATTERN:
--   Agent users have a principal_id linking them to their principal (landlord or tenant).
--   The get_effective_contact_id() helper returns the principal's contact_id for agents,
--   enabling agents to inherit their principal's data access via RLS policies.
--
-- BACKWARD COMPATIBILITY:
--   - is_broker_or_admin() is NOT modified — broker/admin workflows unchanged
--   - users_insert_self policy is NOT modified — self-registration still requires 'pending'
--   - All existing broker/admin RLS policies remain intact

-- ============================================================
-- SECTION 1: Add principal_id column for agent delegation
-- ============================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS principal_id UUID REFERENCES public.users(id);
CREATE INDEX IF NOT EXISTS idx_users_principal ON public.users(principal_id);


-- ============================================================
-- SECTION 2: Update role CHECK constraint to include 6 roles
-- ============================================================

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'broker', 'pending', 'tenant', 'landlord', 'tenant_agent', 'landlord_agent'));


-- ============================================================
-- SECTION 3: Add agent-principal validation constraint
-- ============================================================
-- Non-agent roles MUST have null principal_id.
-- Agent roles MAY have a principal_id (enforced at application level to avoid migration issues).

ALTER TABLE public.users ADD CONSTRAINT users_agent_principal_check
  CHECK (
    role IN ('landlord_agent', 'tenant_agent')
    OR principal_id IS NULL
  );


-- ============================================================
-- SECTION 4: New RLS helper functions for agent-aware access
-- ============================================================

-- Get the effective contact_id for the current user.
-- For agents, this returns their principal's contact_id (delegation).
-- For non-agents, returns their own contact_id.
CREATE OR REPLACE FUNCTION public.get_effective_contact_id()
RETURNS UUID AS $$
  SELECT CASE
    WHEN u.role IN ('landlord_agent', 'tenant_agent') AND u.principal_id IS NOT NULL
    THEN (SELECT contact_id FROM public.users WHERE id = u.principal_id AND is_active = true)
    ELSE u.contact_id
  END
  FROM public.users u
  WHERE u.auth_provider_id = auth.uid()::TEXT
  AND u.is_active = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is a landlord or landlord_agent
CREATE OR REPLACE FUNCTION public.is_landlord_or_agent()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_provider_id = auth.uid()::TEXT
    AND is_active = true
    AND role IN ('landlord', 'landlord_agent')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is a tenant or tenant_agent
CREATE OR REPLACE FUNCTION public.is_tenant_or_agent()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_provider_id = auth.uid()::TEXT
    AND is_active = true
    AND role IN ('tenant', 'tenant_agent')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ============================================================
-- SECTION 5: Update RLS policies for landlord + agent access
-- ============================================================
-- Replace get_user_contact_id() with get_effective_contact_id() so
-- agents inherit their principal's data access.
-- Also add tenant access to tables that previously lacked it.

-- ============================================================
-- LOIS TABLE
-- ============================================================

DROP POLICY IF EXISTS lois_select_landlord ON lois;
CREATE POLICY lois_select_landlord ON lois
  FOR SELECT USING (
    landlord_contact_id = public.get_effective_contact_id()
  );

-- Add tenant select policy (tenants need to see LOIs they are party to)
DROP POLICY IF EXISTS lois_select_tenant ON lois;
CREATE POLICY lois_select_tenant ON lois
  FOR SELECT USING (
    tenant_contact_id = public.get_effective_contact_id()
  );

DROP POLICY IF EXISTS lois_update_landlord ON lois;
CREATE POLICY lois_update_landlord ON lois
  FOR UPDATE USING (
    landlord_contact_id = public.get_effective_contact_id()
    AND status IN ('sent', 'in_negotiation')
  )
  WITH CHECK (
    landlord_contact_id = public.get_effective_contact_id()
  );

-- Tenant update policy for LOIs (for negotiation responses)
DROP POLICY IF EXISTS lois_update_tenant ON lois;
CREATE POLICY lois_update_tenant ON lois
  FOR UPDATE USING (
    tenant_contact_id = public.get_effective_contact_id()
    AND status IN ('sent', 'in_negotiation')
  )
  WITH CHECK (
    tenant_contact_id = public.get_effective_contact_id()
  );


-- ============================================================
-- LOI SECTIONS TABLE
-- ============================================================

DROP POLICY IF EXISTS loi_sections_select_landlord ON loi_sections;
CREATE POLICY loi_sections_select_landlord ON loi_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lois
      WHERE lois.id = loi_sections.loi_id
      AND lois.landlord_contact_id = public.get_effective_contact_id()
    )
  );

DROP POLICY IF EXISTS loi_sections_select_tenant ON loi_sections;
CREATE POLICY loi_sections_select_tenant ON loi_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lois
      WHERE lois.id = loi_sections.loi_id
      AND lois.tenant_contact_id = public.get_effective_contact_id()
    )
  );

DROP POLICY IF EXISTS loi_sections_update_landlord ON loi_sections;
CREATE POLICY loi_sections_update_landlord ON loi_sections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM lois
      WHERE lois.id = loi_sections.loi_id
      AND lois.landlord_contact_id = public.get_effective_contact_id()
      AND lois.status IN ('sent', 'in_negotiation')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lois
      WHERE lois.id = loi_sections.loi_id
      AND lois.landlord_contact_id = public.get_effective_contact_id()
    )
  );

DROP POLICY IF EXISTS loi_sections_update_tenant ON loi_sections;
CREATE POLICY loi_sections_update_tenant ON loi_sections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM lois
      WHERE lois.id = loi_sections.loi_id
      AND lois.tenant_contact_id = public.get_effective_contact_id()
      AND lois.status IN ('sent', 'in_negotiation')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lois
      WHERE lois.id = loi_sections.loi_id
      AND lois.tenant_contact_id = public.get_effective_contact_id()
    )
  );


-- ============================================================
-- LOI NEGOTIATIONS TABLE
-- ============================================================

DROP POLICY IF EXISTS loi_negotiations_select_landlord ON loi_negotiations;
CREATE POLICY loi_negotiations_select_landlord ON loi_negotiations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM loi_sections ls
      JOIN lois l ON l.id = ls.loi_id
      WHERE ls.id = loi_negotiations.loi_section_id
      AND l.landlord_contact_id = public.get_effective_contact_id()
    )
  );

DROP POLICY IF EXISTS loi_negotiations_select_tenant ON loi_negotiations;
CREATE POLICY loi_negotiations_select_tenant ON loi_negotiations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM loi_sections ls
      JOIN lois l ON l.id = ls.loi_id
      WHERE ls.id = loi_negotiations.loi_section_id
      AND l.tenant_contact_id = public.get_effective_contact_id()
    )
  );

DROP POLICY IF EXISTS loi_negotiations_insert_landlord ON loi_negotiations;
CREATE POLICY loi_negotiations_insert_landlord ON loi_negotiations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM loi_sections ls
      JOIN lois l ON l.id = ls.loi_id
      WHERE ls.id = loi_negotiations.loi_section_id
      AND l.landlord_contact_id = public.get_effective_contact_id()
      AND l.status IN ('sent', 'in_negotiation')
    )
  );

DROP POLICY IF EXISTS loi_negotiations_insert_tenant ON loi_negotiations;
CREATE POLICY loi_negotiations_insert_tenant ON loi_negotiations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM loi_sections ls
      JOIN lois l ON l.id = ls.loi_id
      WHERE ls.id = loi_negotiations.loi_section_id
      AND l.tenant_contact_id = public.get_effective_contact_id()
      AND l.status IN ('sent', 'in_negotiation')
    )
  );


-- ============================================================
-- LEASES TABLE — add landlord and tenant select policies
-- ============================================================

DROP POLICY IF EXISTS leases_select_landlord ON leases;
CREATE POLICY leases_select_landlord ON leases
  FOR SELECT USING (
    landlord_contact_id = public.get_effective_contact_id()
  );

DROP POLICY IF EXISTS leases_select_tenant ON leases;
CREATE POLICY leases_select_tenant ON leases
  FOR SELECT USING (
    tenant_contact_id = public.get_effective_contact_id()
  );


-- ============================================================
-- APPLICATIONS TABLE — update tenant access to use effective contact
-- ============================================================

DROP POLICY IF EXISTS applications_select_own ON applications;
CREATE POLICY applications_select_own ON applications
  FOR SELECT USING (
    contact_id = public.get_effective_contact_id()
  );


-- ============================================================
-- APPLICATION DOCUMENTS TABLE — update tenant access
-- ============================================================

DROP POLICY IF EXISTS app_docs_select_own ON application_documents;
CREATE POLICY app_docs_select_own ON application_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = application_documents.application_id
      AND a.contact_id = public.get_effective_contact_id()
    )
  );


-- ============================================================
-- CONTACTS TABLE — allow landlords/tenants to read their own contact row
-- ============================================================

DROP POLICY IF EXISTS contacts_select_own ON contacts;
CREATE POLICY contacts_select_own ON contacts
  FOR SELECT USING (
    id = public.get_effective_contact_id()
  );
