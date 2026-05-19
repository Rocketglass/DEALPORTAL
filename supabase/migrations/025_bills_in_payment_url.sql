-- Rocket Realty Portal — Bills In: optional payment URL.
--
-- Per Rocket's 2026-05-18 feedback: when he uploads a vendor invoice he
-- wants to pay it from inside the portal. The portal doesn't process
-- payments itself, but vendor invoices often include a hosted pay link
-- (Stripe-hosted invoice, ACH portal, etc.). Storing that URL with the bill
-- lets the Bills In list show a "Pay Now" button that opens the vendor's
-- own pay page.

ALTER TABLE bills_in
  ADD COLUMN IF NOT EXISTS payment_url TEXT NULL;
