-- Create the profile-photos storage bucket if it doesn't exist
-- NOTE: This needs to be run with admin privileges

-- Insert the bucket (only if it doesn't already exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'profile-photos',
    'profile-photos',
    true,  -- public bucket so profile photos are accessible
    5242880,  -- 5MB max file size
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to avoid errors)
DROP POLICY IF EXISTS "Allow authenticated profile photo uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public profile photo read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated profile photo updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated profile photo deletes" ON storage.objects;

-- Set up RLS policies for the bucket
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated profile photo uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-photos');

-- Allow public read access
CREATE POLICY "Allow public profile photo read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-photos');

-- Allow authenticated users to update their own uploads
CREATE POLICY "Allow authenticated profile photo updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-photos');

-- Allow authenticated users to delete
CREATE POLICY "Allow authenticated profile photo deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-photos');

-- Verify the bucket was created
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'profile-photos';
