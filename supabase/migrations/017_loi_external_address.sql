-- ============================================================
-- LOI External Address Support
-- Allows LOIs for properties not in the system (other brokers' listings)
-- ============================================================

-- Add nullable address columns for external properties
ALTER TABLE lois ADD COLUMN external_address TEXT;
ALTER TABLE lois ADD COLUMN external_city TEXT;
ALTER TABLE lois ADD COLUMN external_state TEXT;
ALTER TABLE lois ADD COLUMN external_zip TEXT;
ALTER TABLE lois ADD COLUMN external_property_type TEXT;
ALTER TABLE lois ADD COLUMN external_suite TEXT;

-- Make property_id and unit_id nullable (they were NOT NULL before)
ALTER TABLE lois ALTER COLUMN property_id DROP NOT NULL;
ALTER TABLE lois ALTER COLUMN unit_id DROP NOT NULL;

-- Add a check constraint: either property_id is set OR external_address is set
ALTER TABLE lois ADD CONSTRAINT loi_property_or_external
  CHECK (property_id IS NOT NULL OR external_address IS NOT NULL);
