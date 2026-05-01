-- Rocket Realty Portal — Bills In (inbound vendor invoices).
--
-- Per Rocket's 2026-05-01 feedback: in addition to the existing outbound
-- commission invoices, he also wants to track invoices he RECEIVES from
-- vendors / contractors (utilities, marketing, photographers, etc.). Pure
-- bookkeeping — upload PDF, record vendor name + amount, mark paid when
-- paid. No automation, no due-date alerts, no categorization.
--
-- Broker / admin only.

CREATE TABLE IF NOT EXISTS bills_in (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT NOT NULL,
  amount      NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  pdf_url     TEXT NOT NULL,        -- storage path under bills-in bucket
  paid        BOOLEAN NOT NULL DEFAULT false,
  paid_at     TIMESTAMPTZ,          -- stamped when paid toggled true
  uploaded_by UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bills_in_paid       ON bills_in(paid);
CREATE INDEX IF NOT EXISTS idx_bills_in_vendor     ON bills_in(vendor_name);
CREATE INDEX IF NOT EXISTS idx_bills_in_created_at ON bills_in(created_at DESC);

-- RLS: broker / admin only.
ALTER TABLE bills_in ENABLE ROW LEVEL SECURITY;

CREATE POLICY bills_in_select ON bills_in
  FOR SELECT USING (public.is_broker_or_admin());

CREATE POLICY bills_in_insert ON bills_in
  FOR INSERT WITH CHECK (public.is_broker_or_admin());

CREATE POLICY bills_in_update ON bills_in
  FOR UPDATE USING (public.is_broker_or_admin())
  WITH CHECK (public.is_broker_or_admin());

CREATE POLICY bills_in_delete ON bills_in
  FOR DELETE USING (public.is_broker_or_admin());

-- Storage bucket for the uploaded PDFs (private, accessed via signed URLs).
INSERT INTO storage.buckets (id, name, public)
VALUES ('bills-in', 'bills-in', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: broker / admin only for read + write.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'bills_in_storage_select'
  ) THEN
    CREATE POLICY bills_in_storage_select ON storage.objects
      FOR SELECT TO authenticated
      USING (bucket_id = 'bills-in' AND public.is_broker_or_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'bills_in_storage_insert'
  ) THEN
    CREATE POLICY bills_in_storage_insert ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'bills-in' AND public.is_broker_or_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'bills_in_storage_delete'
  ) THEN
    CREATE POLICY bills_in_storage_delete ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'bills-in' AND public.is_broker_or_admin());
  END IF;
END $$;
