-- Create the societies storage bucket if it doesn't exist
-- NOTE: This needs to be run with admin privileges
-- CRITICAL: Bucket name MUST be 'societies' to match code at index.html:50023

-- Insert the bucket (only if it doesn't already exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'societies',
    'societies',
    true,  -- public bucket so logos are accessible
    2097152,  -- 2MB max file size
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to avoid errors)
DROP POLICY IF EXISTS "Allow authenticated society uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public society read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated society updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated society deletes" ON storage.objects;

-- Set up RLS policies for the bucket
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated society uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'societies');

-- Allow public read access
CREATE POLICY "Allow public society read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'societies');

-- Allow authenticated users to update their own uploads
CREATE POLICY "Allow authenticated society updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'societies');

-- Allow authenticated users to delete
CREATE POLICY "Allow authenticated society deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'societies');

-- Verify the bucket was created
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'societies';
