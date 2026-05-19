-- Add structured property/tenant fields to commission_invoices so manual
-- invoices (no linked lease) can store premises and lessee separately
-- instead of mashed into the free-text notes column.
--
-- Existing lease-linked invoices continue to derive these values from the
-- joined lease; these columns let unattached invoices carry the same data.

ALTER TABLE commission_invoices
  ADD COLUMN IF NOT EXISTS property_address text NULL,
  ADD COLUMN IF NOT EXISTS suite_number text NULL,
  ADD COLUMN IF NOT EXISTS lessee_name text NULL;
