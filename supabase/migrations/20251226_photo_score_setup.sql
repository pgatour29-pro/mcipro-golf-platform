-- Photo Score Feature Setup
-- Run this in Supabase SQL Editor

-- 1. Add scorecard_photo_url column to rounds table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'rounds' AND column_name = 'scorecard_photo_url'
    ) THEN
        ALTER TABLE rounds ADD COLUMN scorecard_photo_url TEXT;
        COMMENT ON COLUMN rounds.scorecard_photo_url IS 'URL to uploaded scorecard photo (proof of score)';
    END IF;
END $$;

-- 2. Create scorecard_photos storage bucket (run separately in Dashboard > Storage)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('scorecard_photos', 'scorecard_photos', true);

-- 3. Storage policies for scorecard_photos bucket
-- Drop existing policies first (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Users can upload their own scorecard photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to scorecard photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own scorecard photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to scorecard_photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read scorecard_photos" ON storage.objects;

-- Allow anyone to upload to scorecard_photos (we use LINE user ID as folder, not auth.uid)
CREATE POLICY "Allow public uploads to scorecard_photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'scorecard_photos');

-- Allow public read access to scorecard photos
CREATE POLICY "Allow public read scorecard_photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'scorecard_photos');
