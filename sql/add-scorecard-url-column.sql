-- =====================================================
-- ADD SCORECARD_URL COLUMN TO COURSES TABLE
-- =====================================================
-- This migration adds a scorecard_url column to store
-- references to scorecard images for each course

-- Add scorecard_url column
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS scorecard_url TEXT;

-- Add comment
COMMENT ON COLUMN courses.scorecard_url IS 'Path to scorecard image (e.g., /public/assets/scorecards/burapha.jpg)';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ scorecard_url column added to courses table';
    RAISE NOTICE 'Courses can now reference scorecard images for display during rounds';
END $$;
