-- Prevent duplicate commission invoices for a single lease.
--
-- lease_id was made nullable in migration 016 so manual invoices (not tied to a
-- lease) could be created. Lease-linked invoices, however, are auto-generated
-- exactly once when a lease is executed. Without a constraint, the DocuSign
-- webhook (redeliverable), mark-executed-offline, and the manual generate route
-- could each insert an invoice for the same lease, producing duplicate
-- commission bills.
--
-- A partial unique index enforces at most one invoice per lease while still
-- allowing many manual invoices with lease_id IS NULL. Backs up the
-- application-level idempotency check in lib/commission/generate-invoice.ts.

CREATE UNIQUE INDEX IF NOT EXISTS uq_commission_invoices_lease_id
  ON commission_invoices (lease_id)
  WHERE lease_id IS NOT NULL;
