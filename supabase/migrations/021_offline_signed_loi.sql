-- Rocket Realty Portal — Offline-signed LOI support.
--
-- When a landlord can't or won't use the portal (not tech-savvy, off-system
-- deal, prefers paper), Rocket prints the LOI, takes it to them, and gets
-- it signed in person. This adds a place to store the resulting signed PDF
-- (or phone photo) once Rocket brings it back to the portal.
--
-- The "Mark Agreed (Offline)" flow uploads to this column, flips the LOI
-- status to 'agreed' so it can be converted to a lease, and writes an
-- audit_log entry tagged 'loi_agreed_offline'.
--
-- Leases already carry `lease_pdf_url` and `executed_pdf_url`; the
-- equivalent for offline-signed leases reuses `executed_pdf_url`.

ALTER TABLE lois
  ADD COLUMN IF NOT EXISTS signed_pdf_url TEXT;

COMMENT ON COLUMN lois.signed_pdf_url IS
  'Storage path of an offline-signed LOI (PDF or image). Set when an LOI is marked agreed via the offline flow rather than landlord portal response.';
