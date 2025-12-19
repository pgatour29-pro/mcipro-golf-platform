-- =====================================================
-- ADD OAUTH PROVIDER COLUMNS TO USER_PROFILES
-- =====================================================
-- Enables login via KakaoTalk and Google in addition to LINE
-- Run this in Supabase SQL Editor

-- 1. Add columns for additional OAuth providers
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS google_user_id TEXT,
ADD COLUMN IF NOT EXISTS kakao_user_id TEXT,
ADD COLUMN IF NOT EXISTS oauth_provider TEXT DEFAULT 'line';

-- 2. Create indexes for fast lookup by provider ID
CREATE INDEX IF NOT EXISTS idx_user_profiles_google_id ON user_profiles(google_user_id) WHERE google_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_kakao_id ON user_profiles(kakao_user_id) WHERE kakao_user_id IS NOT NULL;

-- 3. Add unique constraints to prevent duplicate provider IDs
-- (One Google account can only be linked to one MyCaddiPro account)
ALTER TABLE user_profiles
ADD CONSTRAINT unique_google_user_id UNIQUE (google_user_id);

ALTER TABLE user_profiles
ADD CONSTRAINT unique_kakao_user_id UNIQUE (kakao_user_id);

-- 4. Update existing users to have 'line' as their oauth_provider
UPDATE user_profiles
SET oauth_provider = 'line'
WHERE oauth_provider IS NULL AND line_user_id IS NOT NULL;

-- 5. Verify the changes
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name IN ('google_user_id', 'kakao_user_id', 'oauth_provider');

-- 6. Show sample of updated records
SELECT
    line_user_id,
    google_user_id,
    kakao_user_id,
    oauth_provider,
    display_name
FROM user_profiles
LIMIT 5;
