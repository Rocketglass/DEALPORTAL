-- Rocket Realty Portal — leases NOT NULL fix for off-system deals.
--
-- Migration 017 made lois.property_id / unit_id nullable so brokers can write
-- LOIs for properties not in the system. The 2026-05-01 V2 batch (commits
-- e75a17b + 0ba4bde) shipped the broker-facing UI on top of that — off-system
-- LOI mode and Mark-Agreed-Offline / Mark-Executed-Offline.
--
-- The schema for `leases` was never updated to match. property_id and unit_id
-- are still NOT NULL, so converting an external-address LOI to a lease throws
-- a NOT NULL constraint violation. The /api/leases route comment claims
-- relaxation but the DB rejects.
--
-- Fix: drop NOT NULL on both columns. The lease still requires premises_*
-- (address/city/state/sf) which are already NOT NULL, so the lease document
-- itself stays complete. The system property/unit are just for portfolio
-- linkage, which off-system deals don't have.

ALTER TABLE leases ALTER COLUMN property_id DROP NOT NULL;
ALTER TABLE leases ALTER COLUMN unit_id     DROP NOT NULL;

COMMENT ON COLUMN leases.property_id IS
  'Optional — set for portfolio leases, NULL for off-system deals where the broker is repping a tenant on someone else''s property.';
COMMENT ON COLUMN leases.unit_id IS
  'Optional — set for portfolio leases, NULL for off-system deals. premises_address is the canonical lease address regardless.';
