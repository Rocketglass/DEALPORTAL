-- Rocket Realty Deal Flow Portal — Property Photos Storage
-- Migration 007: Storage bucket for property photos + photo_urls column
--
-- Bucket: property-photos (public read, broker/admin write)
-- Column: properties.photo_urls TEXT[] for storing public URLs

-- ============================================================
-- ADD photo_urls COLUMN TO PROPERTIES
-- ============================================================

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}';

-- ============================================================
-- CREATE STORAGE BUCKET
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-photos',
  'property-photos',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- ============================================================
-- STORAGE POLICIES
-- ============================================================

-- Public read access (property photos are public marketing material)
CREATE POLICY storage_property_photos_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'property-photos'
  );

-- Broker/admin can upload property photos
CREATE POLICY storage_property_photos_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'property-photos'
    AND public.is_broker_or_admin()
  );

-- Broker/admin can update property photos
CREATE POLICY storage_property_photos_update ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'property-photos'
    AND public.is_broker_or_admin()
  )
  WITH CHECK (
    bucket_id = 'property-photos'
    AND public.is_broker_or_admin()
  );

-- Broker/admin can delete property photos
CREATE POLICY storage_property_photos_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'property-photos'
    AND public.is_broker_or_admin()
  );
