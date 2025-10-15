-- =====================================================================
-- Add Society Affiliation to User Profiles
-- =====================================================================
-- This migration adds society affiliation fields to the user_profiles table
-- so individual golfers can be linked to their societies.
-- =====================================================================

BEGIN;

-- Add society affiliation columns
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS society_id UUID REFERENCES society_profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS society_name TEXT,
ADD COLUMN IF NOT EXISTS member_since TIMESTAMPTZ DEFAULT NOW();

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_society_id ON user_profiles(society_id);

-- Add comments
COMMENT ON COLUMN user_profiles.society_id IS 'Foreign key to society_profiles table - links golfer to their society';
COMMENT ON COLUMN user_profiles.society_name IS 'Cached society name for quick display (denormalized)';
COMMENT ON COLUMN user_profiles.member_since IS 'When the golfer joined their society';

COMMIT;

-- Verification
SELECT
  'Society Columns Added' as status,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name IN ('society_id', 'society_name', 'member_since')
  ) THEN '✅ PASS' ELSE '❌ FAIL' END as result;
