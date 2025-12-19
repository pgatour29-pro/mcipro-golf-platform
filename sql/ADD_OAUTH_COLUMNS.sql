-- Add OAuth provider columns to user_profiles table
-- Run this in Supabase SQL Editor

-- Add kakao_user_id column for KakaoTalk OAuth
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS kakao_user_id TEXT;

-- Add google_user_id column for Google OAuth
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS google_user_id TEXT;

-- Add oauth_provider column to track which provider was used
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS oauth_provider TEXT;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_kakao_user_id ON user_profiles(kakao_user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_google_user_id ON user_profiles(google_user_id);

-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name IN ('kakao_user_id', 'google_user_id', 'oauth_provider');
