-- =====================================================================
-- RESTORE HOME COURSE DATA - Extract from profile_data JSONB
-- =====================================================================
-- This fixes the issue where home_course_name column is NULL even though
-- the data exists in the profile_data JSONB column.
--
-- ROOT CAUSE:
-- The saveUserProfile method in supabase-config.js was not saving the
-- new columns (home_course_id, home_course_name, society_id, society_name)
-- so every time a profile was saved, it would upsert the row without
-- these columns, effectively setting them to NULL.
--
-- SOLUTION:
-- 1. This SQL extracts the data from profile_data JSONB and populates
--    the dedicated columns
-- 2. The updated saveUserProfile method (deployed 2025-10-21) now
--    saves these columns, preventing future data loss
-- =====================================================================

BEGIN;

-- Update all profiles to extract home course and society data from JSONB
UPDATE user_profiles
SET
    -- Extract home course name from JSONB (multiple possible paths)
    home_course_name = COALESCE(
        home_course_name,  -- Keep existing value if set
        profile_data->'golfInfo'->>'homeClub',  -- Extract from golfInfo
        profile_data->'golfInfo'->>'homeCourse',  -- Alternative path
        home_club  -- Fallback to old home_club column
    ),

    -- Extract society name from JSONB
    society_name = COALESCE(
        society_name,  -- Keep existing value if set
        profile_data->'organizationInfo'->>'societyName',
        profile_data->'organizationInfo'->>'clubAffiliation'
    ),

    -- Also ensure old home_club column is populated for backward compatibility
    home_club = COALESCE(
        home_club,  -- Keep existing value if set
        profile_data->'golfInfo'->>'homeClub',
        profile_data->'golfInfo'->>'homeCourse'
    )
WHERE
    profile_data IS NOT NULL
    AND (
        (home_course_name IS NULL AND (
            profile_data->'golfInfo'->>'homeClub' IS NOT NULL OR
            profile_data->'golfInfo'->>'homeCourse' IS NOT NULL OR
            home_club IS NOT NULL
        ))
        OR
        (society_name IS NULL AND (
            profile_data->'organizationInfo'->>'societyName' IS NOT NULL OR
            profile_data->'organizationInfo'->>'clubAffiliation' IS NOT NULL
        ))
        OR
        (home_club IS NULL AND (
            profile_data->'golfInfo'->>'homeClub' IS NOT NULL OR
            profile_data->'golfInfo'->>'homeCourse' IS NOT NULL
        ))
    );

COMMIT;

-- =====================================================================
-- VERIFICATION QUERIES
-- =====================================================================

-- Show all profiles with their home course data
SELECT
    line_user_id,
    name,
    home_club as old_home_club,
    home_course_name as new_home_course_name,
    society_name,
    profile_data->'golfInfo'->>'homeClub' as jsonb_home_club,
    profile_data->'organizationInfo'->>'societyName' as jsonb_society
FROM user_profiles
WHERE profile_data IS NOT NULL
ORDER BY name;

-- Show specific count of updated profiles
SELECT
    '✅ Home Course Data Restored' as status,
    COUNT(*) as total_profiles,
    COUNT(home_club) as profiles_with_old_home_club,
    COUNT(home_course_name) as profiles_with_new_home_course,
    COUNT(society_name) as profiles_with_society
FROM user_profiles;

-- Show Pete's profile specifically
SELECT
    'Pete Profile' as profile,
    line_user_id,
    name,
    home_club,
    home_course_name,
    society_name,
    profile_data->'golfInfo' as golf_info,
    profile_data->'organizationInfo' as org_info
FROM user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';
