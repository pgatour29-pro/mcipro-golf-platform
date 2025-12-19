-- Create storage bucket for hole layout images
-- Run this in Supabase SQL Editor

-- Create the hole-layouts bucket (public for reading)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'hole-layouts',
    'hole-layouts',
    true,  -- Public bucket (anyone can view)
    5242880,  -- 5MB max file size
    ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[];

-- Storage policy: Allow public read access
CREATE POLICY IF NOT EXISTS "Public can view hole layouts"
ON storage.objects FOR SELECT
USING (bucket_id = 'hole-layouts');

-- Storage policy: Only authenticated users can upload (organizers/admins)
CREATE POLICY IF NOT EXISTS "Authenticated users can upload hole layouts"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'hole-layouts'
    AND auth.role() = 'authenticated'
);

-- Storage policy: Only authenticated users can update
CREATE POLICY IF NOT EXISTS "Authenticated users can update hole layouts"
ON storage.objects FOR UPDATE
USING (bucket_id = 'hole-layouts')
WITH CHECK (auth.role() = 'authenticated');

-- Storage policy: Only authenticated users can delete
CREATE POLICY IF NOT EXISTS "Authenticated users can delete hole layouts"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'hole-layouts'
    AND auth.role() = 'authenticated'
);

-- ALTERNATIVE: If you want anyone to be able to upload (simpler for testing):
-- Uncomment the following and comment out the authenticated policies above

/*
-- Allow anyone to upload (for easier testing)
CREATE POLICY IF NOT EXISTS "Anyone can upload hole layouts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'hole-layouts');

CREATE POLICY IF NOT EXISTS "Anyone can update hole layouts"
ON storage.objects FOR UPDATE
USING (bucket_id = 'hole-layouts');

CREATE POLICY IF NOT EXISTS "Anyone can delete hole layouts"
ON storage.objects FOR DELETE
USING (bucket_id = 'hole-layouts');
*/

-- ===========================================
-- FOLDER STRUCTURE EXPECTED:
-- ===========================================
-- hole-layouts/
--   {course_id}/
--     hole_1.jpg
--     hole_2.jpg
--     ...
--     hole_18.jpg
--
-- Example URLs:
-- https://pyeeplwsnupmhgbguwqs.supabase.co/storage/v1/object/public/hole-layouts/plutaluang/hole_1.jpg
-- https://pyeeplwsnupmhgbguwqs.supabase.co/storage/v1/object/public/hole-layouts/burapha/hole_5.jpg
-- https://pyeeplwsnupmhgbguwqs.supabase.co/storage/v1/object/public/hole-layouts/greenwood-a/hole_9.jpg
-- ===========================================

-- Show success message
SELECT 'hole-layouts bucket created successfully!' AS result;
