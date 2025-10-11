-- Add profile_data JSONB column to user_profiles table
-- This stores the FULL profile data for cross-device sync

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS profile_data JSONB DEFAULT '{}'::jsonb;

-- Add index for fast JSONB queries if needed
CREATE INDEX IF NOT EXISTS idx_user_profiles_profile_data
ON user_profiles USING gin (profile_data);

-- Update comment
COMMENT ON COLUMN user_profiles.profile_data IS 'Full profile data including personalInfo, golfInfo, professionalInfo, skills, preferences, media, privacy - used for cross-device profile sync';

SELECT 'profile_data column added successfully!' as status;
