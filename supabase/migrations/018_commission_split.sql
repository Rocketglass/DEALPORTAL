-- Add commission split support to invoices.
-- Allows tracking when a commission is split between listing and cooperating agents.
-- Default 100 = full commission (representing both sides / dual agency).

ALTER TABLE commission_invoices
  ADD COLUMN commission_split_percent NUMERIC(5,2) DEFAULT 100,
  ADD COLUMN split_with_agent TEXT;

COMMENT ON COLUMN commission_invoices.commission_split_percent
  IS 'Our share of the total commission as a percentage (100 = full, 50 = half)';
COMMENT ON COLUMN commission_invoices.split_with_agent
  IS 'Name of the cooperating agent/brokerage receiving the other side of the split';
