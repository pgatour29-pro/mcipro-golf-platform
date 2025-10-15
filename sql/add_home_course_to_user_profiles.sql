-- =====================================================================
-- Add Home Course Reference to User Profiles
-- =====================================================================
-- This migration adds structured home course fields to the user_profiles table
-- to replace the plain text home_club field with proper references.
-- =====================================================================

BEGIN;

-- Add home course reference columns
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS home_course_id TEXT,
ADD COLUMN IF NOT EXISTS home_course_name TEXT;

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_home_course_id ON user_profiles(home_course_id);

-- Add comments
COMMENT ON COLUMN user_profiles.home_course_id IS 'Golf course ID - references the golfer home course';
COMMENT ON COLUMN user_profiles.home_course_name IS 'Cached home course name for quick display (denormalized)';
COMMENT ON COLUMN user_profiles.home_club IS 'DEPRECATED: Use home_course_name instead. Kept for backward compatibility.';

COMMIT;

-- Verification
SELECT
  'Home Course Columns Added' as status,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name IN ('home_course_id', 'home_course_name')
  ) THEN '✅ PASS' ELSE '❌ FAIL' END as result;
