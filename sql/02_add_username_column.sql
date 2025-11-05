-- =====================================================================
-- ADD USERNAME COLUMN TO user_profiles
-- =====================================================================
-- Date: 2025-11-05
-- Purpose: Add username as a flat column for faster queries and uniqueness
-- =====================================================================

BEGIN;

-- =====================================================
-- STEP 1: Add username column
-- =====================================================

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS username TEXT;

-- =====================================================
-- STEP 2: Backfill username from profile_data JSONB
-- =====================================================

-- Extract username from profile_data if it exists
UPDATE user_profiles
SET username = profile_data->>'username'
WHERE username IS NULL
  AND profile_data->>'username' IS NOT NULL
  AND profile_data->>'username' != '';

-- =====================================================
-- STEP 3: Generate username for profiles without one
-- =====================================================

-- Use name, or line_user_id if name is empty
UPDATE user_profiles
SET username = COALESCE(
    -- Try to use name without spaces
    LOWER(REPLACE(name, ' ', '')),
    -- Fallback to first 10 chars of line_user_id
    SUBSTRING(line_user_id, 1, 10)
)
WHERE username IS NULL OR username = '';

-- =====================================================
-- STEP 4: Handle duplicate usernames
-- =====================================================

-- Add number suffix to duplicates (e.g., rockyjones2, rockyjones3)
WITH duplicates AS (
    SELECT
        line_user_id,
        username,
        ROW_NUMBER() OVER (PARTITION BY username ORDER BY created_at) as rn
    FROM user_profiles
    WHERE username IS NOT NULL
)
UPDATE user_profiles up
SET username = d.username || d.rn
FROM duplicates d
WHERE up.line_user_id = d.line_user_id
  AND d.rn > 1;

-- =====================================================
-- STEP 5: Add unique constraint
-- =====================================================

-- Create unique index (allows NULL but enforces uniqueness for non-NULL values)
DROP INDEX IF EXISTS idx_user_profiles_username_unique;
CREATE UNIQUE INDEX idx_user_profiles_username_unique
    ON user_profiles(username)
    WHERE username IS NOT NULL;

-- =====================================================
-- STEP 6: Add regular index for lookups
-- =====================================================

DROP INDEX IF EXISTS idx_user_profiles_username;
CREATE INDEX idx_user_profiles_username
    ON user_profiles(username);

-- =====================================================
-- STEP 7: Sync username back to profile_data
-- =====================================================

UPDATE user_profiles
SET profile_data = jsonb_set(
    profile_data,
    '{username}',
    to_jsonb(username)
)
WHERE username IS NOT NULL
  AND (profile_data->>'username' IS NULL OR profile_data->>'username' = '');

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Show username statistics
SELECT
    'Username Statistics' as report,
    COUNT(*) as total_profiles,
    COUNT(username) as profiles_with_username,
    COUNT(DISTINCT username) as unique_usernames,
    ROUND(100.0 * COUNT(username) / COUNT(*), 2) as coverage_percentage
FROM user_profiles;

-- Show sample usernames
SELECT
    'Sample Usernames' as report,
    line_user_id,
    name,
    username,
    created_at
FROM user_profiles
ORDER BY created_at DESC
LIMIT 10;

-- Check for any remaining duplicates (should be 0)
SELECT
    'Duplicate Check' as report,
    username,
    COUNT(*) as count
FROM user_profiles
WHERE username IS NOT NULL
GROUP BY username
HAVING COUNT(*) > 1;

COMMIT;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ USERNAME COLUMN ADDED SUCCESSFULLY!';
    RAISE NOTICE '   - Column created with unique constraint';
    RAISE NOTICE '   - Backfilled from profile_data JSONB';
    RAISE NOTICE '   - Generated usernames for empty profiles';
    RAISE NOTICE '   - Resolved duplicate usernames';
    RAISE NOTICE '   - Synced back to profile_data';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Run verification queries above to check results';
END $$;
