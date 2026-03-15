-- Rocket Realty Deal Flow Portal — Atomic QR Scan Increment
-- Migration 008: RPC function for atomic scan_count increment
--
-- Avoids read-modify-write race condition when multiple users
-- scan the same QR code simultaneously.

CREATE OR REPLACE FUNCTION increment_qr_scan(qr_id UUID)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE qr_codes
  SET scan_count = scan_count + 1,
      last_scanned_at = now()
  WHERE id = qr_id;
$$;
