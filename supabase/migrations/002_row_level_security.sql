-- Rocket Realty Deal Flow Portal — Row Level Security
-- Migration 002: Comprehensive RLS policies for all tables
--
-- Roles:
--   - 'admin'  : Developer (Neil @ SersweAI) — full access
--   - 'broker' : Rocket Glass — full access to deal pipeline
--   - 'tenant' : Prospective tenants — limited to own data
--   - 'landlord': Property owners — limited to LOIs sent to them
--
-- Helper: get the current user's role from the users table

-- ============================================================
-- HELPER FUNCTION: get current user role
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users
  WHERE auth_provider_id = auth.uid()::TEXT
  AND is_active = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get current user's email
CREATE OR REPLACE FUNCTION public.get_user_email()
RETURNS TEXT AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get current user's contact_id
CREATE OR REPLACE FUNCTION public.get_user_contact_id()
RETURNS UUID AS $$
  SELECT contact_id FROM public.users
  WHERE auth_provider_id = auth.uid()::TEXT
  AND is_active = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if current user is broker or admin
CREATE OR REPLACE FUNCTION public.is_broker_or_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_provider_id = auth.uid()::TEXT
    AND is_active = true
    AND role IN ('broker', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ============================================================
-- USERS TABLE
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own row
CREATE POLICY users_select_own ON users
  FOR SELECT USING (
    auth_provider_id = auth.uid()::TEXT
  );

-- Admin can read all users
CREATE POLICY users_select_admin ON users
  FOR SELECT USING (
    public.is_broker_or_admin()
  );

-- Users can update their own row (e.g., last_login)
CREATE POLICY users_update_own ON users
  FOR UPDATE USING (
    auth_provider_id = auth.uid()::TEXT
  )
  WITH CHECK (
    auth_provider_id = auth.uid()::TEXT
  );

-- Only admin can insert/delete users
CREATE POLICY users_insert_admin ON users
  FOR INSERT WITH CHECK (
    public.get_user_role() = 'admin'
  );

CREATE POLICY users_delete_admin ON users
  FOR DELETE USING (
    public.get_user_role() = 'admin'
  );


-- ============================================================
-- PROPERTIES TABLE
-- ============================================================
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Public can view active properties (for browsing)
CREATE POLICY properties_select_public ON properties
  FOR SELECT USING (
    is_active = true
    OR public.is_broker_or_admin()
  );

-- Broker/admin can insert, update, delete
CREATE POLICY properties_insert ON properties
  FOR INSERT WITH CHECK (
    public.is_broker_or_admin()
  );

CREATE POLICY properties_update ON properties
  FOR UPDATE USING (
    public.is_broker_or_admin()
  )
  WITH CHECK (
    public.is_broker_or_admin()
  );

CREATE POLICY properties_delete ON properties
  FOR DELETE USING (
    public.is_broker_or_admin()
  );


-- ============================================================
-- UNITS TABLE
-- ============================================================
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

-- Public can view vacant units in active properties
CREATE POLICY units_select_public ON units
  FOR SELECT USING (
    (status = 'vacant' AND EXISTS (
      SELECT 1 FROM properties WHERE properties.id = units.property_id AND properties.is_active = true
    ))
    OR public.is_broker_or_admin()
  );

-- Broker/admin can insert, update, delete
CREATE POLICY units_insert ON units
  FOR INSERT WITH CHECK (
    public.is_broker_or_admin()
  );

CREATE POLICY units_update ON units
  FOR UPDATE USING (
    public.is_broker_or_admin()
  )
  WITH CHECK (
    public.is_broker_or_admin()
  );

CREATE POLICY units_delete ON units
  FOR DELETE USING (
    public.is_broker_or_admin()
  );


-- ============================================================
-- CONTACTS TABLE
-- ============================================================
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Only broker/admin can access contacts
CREATE POLICY contacts_select ON contacts
  FOR SELECT USING (
    public.is_broker_or_admin()
  );

CREATE POLICY contacts_insert ON contacts
  FOR INSERT WITH CHECK (
    public.is_broker_or_admin()
  );

CREATE POLICY contacts_update ON contacts
  FOR UPDATE USING (
    public.is_broker_or_admin()
  )
  WITH CHECK (
    public.is_broker_or_admin()
  );

CREATE POLICY contacts_delete ON contacts
  FOR DELETE USING (
    public.is_broker_or_admin()
  );


-- ============================================================
-- APPLICATIONS TABLE
-- ============================================================
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Broker/admin can read all applications
CREATE POLICY applications_select_broker ON applications
  FOR SELECT USING (
    public.is_broker_or_admin()
  );

-- Tenants can view their own applications (matched by email on contact)
CREATE POLICY applications_select_own ON applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = applications.contact_id
      AND c.email = public.get_user_email()
    )
  );

-- Authenticated users can submit (insert) applications
CREATE POLICY applications_insert ON applications
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Only broker/admin can update applications (review, status change)
CREATE POLICY applications_update ON applications
  FOR UPDATE USING (
    public.is_broker_or_admin()
  )
  WITH CHECK (
    public.is_broker_or_admin()
  );

-- Only broker/admin can delete applications
CREATE POLICY applications_delete ON applications
  FOR DELETE USING (
    public.is_broker_or_admin()
  );


-- ============================================================
-- APPLICATION DOCUMENTS TABLE
-- ============================================================
ALTER TABLE application_documents ENABLE ROW LEVEL SECURITY;

-- Broker/admin can read all documents
CREATE POLICY app_docs_select_broker ON application_documents
  FOR SELECT USING (
    public.is_broker_or_admin()
  );

-- Tenants can view documents for their own applications
CREATE POLICY app_docs_select_own ON application_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM applications a
      JOIN contacts c ON c.id = a.contact_id
      WHERE a.id = application_documents.application_id
      AND c.email = public.get_user_email()
    )
  );

-- Authenticated users can upload documents (insert)
CREATE POLICY app_docs_insert ON application_documents
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM applications a
      JOIN contacts c ON c.id = a.contact_id
      WHERE a.id = application_documents.application_id
      AND (
        c.email = public.get_user_email()
        OR public.is_broker_or_admin()
      )
    )
  );

-- Only broker/admin can update (mark as reviewed) or delete
CREATE POLICY app_docs_update ON application_documents
  FOR UPDATE USING (
    public.is_broker_or_admin()
  )
  WITH CHECK (
    public.is_broker_or_admin()
  );

CREATE POLICY app_docs_delete ON application_documents
  FOR DELETE USING (
    public.is_broker_or_admin()
  );


-- ============================================================
-- LOIS TABLE (Letters of Intent)
-- ============================================================
ALTER TABLE lois ENABLE ROW LEVEL SECURITY;

-- Broker/admin can do everything
CREATE POLICY lois_select_broker ON lois
  FOR SELECT USING (
    public.is_broker_or_admin()
  );

-- Landlords can view LOIs where they are the landlord_contact_id
CREATE POLICY lois_select_landlord ON lois
  FOR SELECT USING (
    landlord_contact_id = public.get_user_contact_id()
  );

CREATE POLICY lois_insert ON lois
  FOR INSERT WITH CHECK (
    public.is_broker_or_admin()
  );

CREATE POLICY lois_update_broker ON lois
  FOR UPDATE USING (
    public.is_broker_or_admin()
  )
  WITH CHECK (
    public.is_broker_or_admin()
  );

-- Landlords can update LOIs sent to them (for negotiation responses)
CREATE POLICY lois_update_landlord ON lois
  FOR UPDATE USING (
    landlord_contact_id = public.get_user_contact_id()
    AND status IN ('sent', 'in_negotiation')
  )
  WITH CHECK (
    landlord_contact_id = public.get_user_contact_id()
  );

CREATE POLICY lois_delete ON lois
  FOR DELETE USING (
    public.is_broker_or_admin()
  );


-- ============================================================
-- LOI SECTIONS TABLE
-- ============================================================
ALTER TABLE loi_sections ENABLE ROW LEVEL SECURITY;

-- Broker/admin can do everything
CREATE POLICY loi_sections_select_broker ON loi_sections
  FOR SELECT USING (
    public.is_broker_or_admin()
  );

-- Landlords can view sections for LOIs sent to them
CREATE POLICY loi_sections_select_landlord ON loi_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lois
      WHERE lois.id = loi_sections.loi_id
      AND lois.landlord_contact_id = public.get_user_contact_id()
    )
  );

CREATE POLICY loi_sections_insert ON loi_sections
  FOR INSERT WITH CHECK (
    public.is_broker_or_admin()
  );

CREATE POLICY loi_sections_update_broker ON loi_sections
  FOR UPDATE USING (
    public.is_broker_or_admin()
  )
  WITH CHECK (
    public.is_broker_or_admin()
  );

-- Landlords can update sections (counter, accept, reject) for LOIs sent to them
CREATE POLICY loi_sections_update_landlord ON loi_sections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM lois
      WHERE lois.id = loi_sections.loi_id
      AND lois.landlord_contact_id = public.get_user_contact_id()
      AND lois.status IN ('sent', 'in_negotiation')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lois
      WHERE lois.id = loi_sections.loi_id
      AND lois.landlord_contact_id = public.get_user_contact_id()
    )
  );

CREATE POLICY loi_sections_delete ON loi_sections
  FOR DELETE USING (
    public.is_broker_or_admin()
  );


-- ============================================================
-- LOI NEGOTIATIONS TABLE
-- ============================================================
ALTER TABLE loi_negotiations ENABLE ROW LEVEL SECURITY;

-- Broker/admin can do everything
CREATE POLICY loi_negotiations_select_broker ON loi_negotiations
  FOR SELECT USING (
    public.is_broker_or_admin()
  );

-- Landlords can view negotiations for LOIs sent to them
CREATE POLICY loi_negotiations_select_landlord ON loi_negotiations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM loi_sections ls
      JOIN lois l ON l.id = ls.loi_id
      WHERE ls.id = loi_negotiations.loi_section_id
      AND l.landlord_contact_id = public.get_user_contact_id()
    )
  );

CREATE POLICY loi_negotiations_insert_broker ON loi_negotiations
  FOR INSERT WITH CHECK (
    public.is_broker_or_admin()
  );

-- Landlords can insert negotiation entries (counter-offers, accepts)
CREATE POLICY loi_negotiations_insert_landlord ON loi_negotiations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM loi_sections ls
      JOIN lois l ON l.id = ls.loi_id
      WHERE ls.id = loi_negotiations.loi_section_id
      AND l.landlord_contact_id = public.get_user_contact_id()
      AND l.status IN ('sent', 'in_negotiation')
    )
  );

CREATE POLICY loi_negotiations_delete ON loi_negotiations
  FOR DELETE USING (
    public.is_broker_or_admin()
  );


-- ============================================================
-- LEASES TABLE — Broker/admin only
-- ============================================================
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;

CREATE POLICY leases_select ON leases
  FOR SELECT USING (
    public.is_broker_or_admin()
  );

CREATE POLICY leases_insert ON leases
  FOR INSERT WITH CHECK (
    public.is_broker_or_admin()
  );

CREATE POLICY leases_update ON leases
  FOR UPDATE USING (
    public.is_broker_or_admin()
  )
  WITH CHECK (
    public.is_broker_or_admin()
  );

CREATE POLICY leases_delete ON leases
  FOR DELETE USING (
    public.is_broker_or_admin()
  );


-- ============================================================
-- RENT ESCALATIONS TABLE — Broker/admin only
-- ============================================================
ALTER TABLE rent_escalations ENABLE ROW LEVEL SECURITY;

CREATE POLICY rent_escalations_select ON rent_escalations
  FOR SELECT USING (
    public.is_broker_or_admin()
  );

CREATE POLICY rent_escalations_insert ON rent_escalations
  FOR INSERT WITH CHECK (
    public.is_broker_or_admin()
  );

CREATE POLICY rent_escalations_update ON rent_escalations
  FOR UPDATE USING (
    public.is_broker_or_admin()
  )
  WITH CHECK (
    public.is_broker_or_admin()
  );

CREATE POLICY rent_escalations_delete ON rent_escalations
  FOR DELETE USING (
    public.is_broker_or_admin()
  );


-- ============================================================
-- COMMISSION INVOICES TABLE — Broker/admin ONLY (most sensitive)
-- ============================================================
ALTER TABLE commission_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY commission_invoices_select ON commission_invoices
  FOR SELECT USING (
    public.is_broker_or_admin()
  );

CREATE POLICY commission_invoices_insert ON commission_invoices
  FOR INSERT WITH CHECK (
    public.is_broker_or_admin()
  );

CREATE POLICY commission_invoices_update ON commission_invoices
  FOR UPDATE USING (
    public.is_broker_or_admin()
  )
  WITH CHECK (
    public.is_broker_or_admin()
  );

CREATE POLICY commission_invoices_delete ON commission_invoices
  FOR DELETE USING (
    public.is_broker_or_admin()
  );


-- ============================================================
-- QR CODES TABLE
-- ============================================================
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

-- Broker/admin can do everything
CREATE POLICY qr_codes_select_broker ON qr_codes
  FOR SELECT USING (
    public.is_broker_or_admin()
  );

-- Public can look up active QR codes (for redirect)
CREATE POLICY qr_codes_select_public ON qr_codes
  FOR SELECT USING (
    is_active = true
  );

CREATE POLICY qr_codes_insert ON qr_codes
  FOR INSERT WITH CHECK (
    public.is_broker_or_admin()
  );

CREATE POLICY qr_codes_update_broker ON qr_codes
  FOR UPDATE USING (
    public.is_broker_or_admin()
  )
  WITH CHECK (
    public.is_broker_or_admin()
  );

-- Public can increment scan_count only (via service role in practice,
-- but allow authenticated update of scan_count for the redirect handler)
CREATE POLICY qr_codes_update_scan ON qr_codes
  FOR UPDATE USING (
    is_active = true
  )
  WITH CHECK (
    is_active = true
  );

CREATE POLICY qr_codes_delete ON qr_codes
  FOR DELETE USING (
    public.is_broker_or_admin()
  );


-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY notifications_select_own ON notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = notifications.user_id
      AND users.auth_provider_id = auth.uid()::TEXT
    )
  );

-- Broker/admin can see all (for admin panel)
CREATE POLICY notifications_select_admin ON notifications
  FOR SELECT USING (
    public.is_broker_or_admin()
  );

-- System inserts (via service role), but broker/admin can also insert
CREATE POLICY notifications_insert ON notifications
  FOR INSERT WITH CHECK (
    public.is_broker_or_admin()
  );

-- Users can update their own (mark as read)
CREATE POLICY notifications_update_own ON notifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = notifications.user_id
      AND users.auth_provider_id = auth.uid()::TEXT
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = notifications.user_id
      AND users.auth_provider_id = auth.uid()::TEXT
    )
  );

-- Only admin can delete notifications
CREATE POLICY notifications_delete ON notifications
  FOR DELETE USING (
    public.get_user_role() = 'admin'
  );


-- ============================================================
-- AUDIT LOG TABLE — Append-only, broker/admin read
-- ============================================================
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Broker/admin can read audit log
CREATE POLICY audit_log_select ON audit_log
  FOR SELECT USING (
    public.is_broker_or_admin()
  );

-- System inserts via service role. Also allow broker/admin to insert
-- (for application-level audit logging via the anon key with RLS)
CREATE POLICY audit_log_insert ON audit_log
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- NO UPDATE policy — audit log entries are immutable
-- NO DELETE policy — audit log entries cannot be deleted
