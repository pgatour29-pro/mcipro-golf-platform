-- Course Requests Table and Storage Bucket Setup
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. CREATE COURSE_REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS course_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_name TEXT NOT NULL,
    location TEXT,
    notes TEXT,
    scorecard_photo_url TEXT,
    submitted_by TEXT NOT NULL,  -- LINE user ID
    submitter_name TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_course_requests_status ON course_requests(status);
CREATE INDEX IF NOT EXISTS idx_course_requests_submitted_by ON course_requests(submitted_by);
CREATE INDEX IF NOT EXISTS idx_course_requests_created_at ON course_requests(created_at DESC);

-- ============================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
ALTER TABLE course_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (submit a request)
CREATE POLICY "Anyone can submit course requests"
ON course_requests FOR INSERT
TO public
WITH CHECK (true);

-- Anyone can view all requests (or restrict to admins if needed)
CREATE POLICY "Anyone can view course requests"
ON course_requests FOR SELECT
TO public
USING (true);

-- Only admins can update (change status, add notes)
-- For now, allow all updates - admin check is done in frontend
CREATE POLICY "Allow updates to course requests"
ON course_requests FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- ============================================
-- 3. CREATE STORAGE BUCKET FOR SCORECARD PHOTOS
-- ============================================
-- Note: Run this in Supabase Dashboard > Storage > Create new bucket
-- Or use the Supabase API

-- Bucket name: golfcourse_scorecards
-- Public: Yes (so images can be viewed)
-- File size limit: 10MB
-- Allowed MIME types: image/jpeg, image/png, image/webp

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'golfcourse_scorecards',
    'golfcourse_scorecards',
    true,
    10485760,  -- 10MB in bytes
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- ============================================
-- 4. STORAGE POLICIES
-- ============================================

-- Allow anyone to upload to golfcourse_scorecards bucket
CREATE POLICY "Anyone can upload scorecard photos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'golfcourse_scorecards');

-- Allow anyone to view scorecard photos (public bucket)
CREATE POLICY "Anyone can view scorecard photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'golfcourse_scorecards');

-- ============================================
-- 5. GRANT PERMISSIONS
-- ============================================
GRANT ALL ON course_requests TO anon;
GRANT ALL ON course_requests TO authenticated;
GRANT USAGE ON SCHEMA storage TO anon;
GRANT USAGE ON SCHEMA storage TO authenticated;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify setup:

-- Check table exists
-- SELECT * FROM course_requests LIMIT 5;

-- Check bucket exists
-- SELECT * FROM storage.buckets WHERE id = 'golfcourse_scorecards';

-- Check policies
-- SELECT * FROM pg_policies WHERE tablename = 'course_requests';
