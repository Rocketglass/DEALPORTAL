-- Rocket Realty Deal Flow Portal — Storage Bucket Security
-- Migration 003: Storage buckets with strict access policies
--
-- Buckets:
--   1. application-documents — tenant uploads, broker/admin reads
--   2. lease-documents — broker/admin only
--   3. invoice-documents — broker/admin only (most sensitive)
--
-- All buckets: PDF, PNG, JPG only. 10MB max. No public access. No anonymous access.

-- ============================================================
-- CREATE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'application-documents',
  'application-documents',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'image/png', 'image/jpeg'];

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lease-documents',
  'lease-documents',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'image/png', 'image/jpeg'];

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoice-documents',
  'invoice-documents',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'image/png', 'image/jpeg'];


-- ============================================================
-- APPLICATION DOCUMENTS BUCKET POLICIES
-- ============================================================

-- Broker/admin can read all application documents
CREATE POLICY storage_app_docs_select_broker ON storage.objects
  FOR SELECT USING (
    bucket_id = 'application-documents'
    AND public.is_broker_or_admin()
  );

-- Tenants can read their own application documents
-- Files are stored as: application-documents/{application_id}/{filename}
-- The tenant must own the application (matched by email on contact)
CREATE POLICY storage_app_docs_select_own ON storage.objects
  FOR SELECT USING (
    bucket_id = 'application-documents'
    AND EXISTS (
      SELECT 1 FROM applications a
      JOIN contacts c ON c.id = a.contact_id
      WHERE a.id::TEXT = (storage.foldername(name))[1]
      AND c.email = public.get_user_email()
    )
  );

-- Tenants can upload to their own application folder only
CREATE POLICY storage_app_docs_insert_own ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'application-documents'
    AND auth.uid() IS NOT NULL
    AND (
      public.is_broker_or_admin()
      OR EXISTS (
        SELECT 1 FROM applications a
        JOIN contacts c ON c.id = a.contact_id
        WHERE a.id::TEXT = (storage.foldername(name))[1]
        AND c.email = public.get_user_email()
      )
    )
  );

-- Only broker/admin can update or delete application documents
CREATE POLICY storage_app_docs_update ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'application-documents'
    AND public.is_broker_or_admin()
  )
  WITH CHECK (
    bucket_id = 'application-documents'
    AND public.is_broker_or_admin()
  );

CREATE POLICY storage_app_docs_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'application-documents'
    AND public.is_broker_or_admin()
  );


-- ============================================================
-- LEASE DOCUMENTS BUCKET POLICIES — Broker/admin only
-- ============================================================

CREATE POLICY storage_lease_docs_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'lease-documents'
    AND public.is_broker_or_admin()
  );

CREATE POLICY storage_lease_docs_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'lease-documents'
    AND public.is_broker_or_admin()
  );

CREATE POLICY storage_lease_docs_update ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'lease-documents'
    AND public.is_broker_or_admin()
  )
  WITH CHECK (
    bucket_id = 'lease-documents'
    AND public.is_broker_or_admin()
  );

CREATE POLICY storage_lease_docs_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'lease-documents'
    AND public.is_broker_or_admin()
  );


-- ============================================================
-- INVOICE DOCUMENTS BUCKET POLICIES — Broker/admin only (most sensitive)
-- ============================================================

CREATE POLICY storage_invoice_docs_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'invoice-documents'
    AND public.is_broker_or_admin()
  );

CREATE POLICY storage_invoice_docs_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'invoice-documents'
    AND public.is_broker_or_admin()
  );

CREATE POLICY storage_invoice_docs_update ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'invoice-documents'
    AND public.is_broker_or_admin()
  )
  WITH CHECK (
    bucket_id = 'invoice-documents'
    AND public.is_broker_or_admin()
  );

CREATE POLICY storage_invoice_docs_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'invoice-documents'
    AND public.is_broker_or_admin()
  );
