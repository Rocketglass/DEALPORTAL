-- Add suite_sf (square footage) to commission_invoices so the invoice can
-- show monthly / annual / per-SF breakdowns and so manual invoices carry
-- enough comp-grade data to be saved as comparable_transactions later.

ALTER TABLE commission_invoices
  ADD COLUMN IF NOT EXISTS suite_sf integer NULL;
