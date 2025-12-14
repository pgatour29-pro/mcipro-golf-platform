-- =====================================================
-- CREATE MARKETPLACE-IMAGES STORAGE BUCKET
-- =====================================================
-- Run this in Supabase SQL Editor to create the storage bucket
-- for marketplace listing images

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'marketplace-images',
    'marketplace-images',
    true,
    5242880,  -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- 2. Allow anyone to VIEW images (public bucket)
DROP POLICY IF EXISTS "Anyone can view marketplace images" ON storage.objects;
CREATE POLICY "Anyone can view marketplace images"
ON storage.objects FOR SELECT
USING (bucket_id = 'marketplace-images');

-- 3. Allow anyone to UPLOAD images (for unauthenticated LINE users)
DROP POLICY IF EXISTS "Anyone can upload marketplace images" ON storage.objects;
CREATE POLICY "Anyone can upload marketplace images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'marketplace-images');

-- 4. Allow anyone to UPDATE their images
DROP POLICY IF EXISTS "Anyone can update marketplace images" ON storage.objects;
CREATE POLICY "Anyone can update marketplace images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'marketplace-images');

-- 5. Allow anyone to DELETE images
DROP POLICY IF EXISTS "Anyone can delete marketplace images" ON storage.objects;
CREATE POLICY "Anyone can delete marketplace images"
ON storage.objects FOR DELETE
USING (bucket_id = 'marketplace-images');

-- Verify bucket was created
SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'marketplace-images';

-- Verify policies exist
SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%marketplace%';
