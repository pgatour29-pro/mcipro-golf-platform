-- ONE FILE TO RUN - Copy and paste this entire file into Supabase SQL Editor

BEGIN;

-- Add new columns (safe - won't error if they exist)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS society_id UUID;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS society_name TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS member_since TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS home_course_id TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS home_course_name TEXT;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_society_id ON user_profiles(society_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_home_course_id ON user_profiles(home_course_id);

-- Migrate existing data from JSONB
UPDATE user_profiles
SET
    home_course_name = COALESCE(home_course_name, profile_data->'golfInfo'->>'homeClub', home_club),
    society_name = COALESCE(society_name, profile_data->'organizationInfo'->>'societyName')
WHERE profile_data IS NOT NULL;

COMMIT;

-- Show Pete's profile
SELECT
    name,
    home_club,
    home_course_name,
    society_name
FROM user_profiles
WHERE name ILIKE '%Pete%';
