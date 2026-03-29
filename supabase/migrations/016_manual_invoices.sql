-- Allow commission invoices to be created without a lease (manual invoices).
-- The lease_id column is made nullable so invoices can be generated on demand
-- without being tied to a specific lease execution.

ALTER TABLE commission_invoices ALTER COLUMN lease_id DROP NOT NULL;
