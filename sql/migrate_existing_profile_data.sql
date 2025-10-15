-- =====================================================================
-- Migrate Existing Profile Data
-- =====================================================================
-- This migration extracts society and home course data from the profile_data
-- JSONB column and moves it to dedicated columns for better performance
-- and structured queries.
-- =====================================================================

BEGIN;

-- Migrate home course data from JSONB to dedicated columns
UPDATE user_profiles
SET
    home_course_name = COALESCE(
        home_course_name,
        profile_data->'golfInfo'->>'homeClub',
        home_club  -- Fallback to old home_club field
    ),
    society_name = COALESCE(
        society_name,
        profile_data->'organizationInfo'->>'societyName'
    )
WHERE
    profile_data IS NOT NULL
    AND (
        (home_course_name IS NULL AND (profile_data->'golfInfo'->>'homeClub' IS NOT NULL OR home_club IS NOT NULL))
        OR
        (society_name IS NULL AND profile_data->'organizationInfo'->>'societyName' IS NOT NULL)
    );

-- Log results
DO $$
DECLARE
    v_updated_home_course INTEGER;
    v_updated_society INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_updated_home_course
    FROM user_profiles
    WHERE home_course_name IS NOT NULL;

    SELECT COUNT(*) INTO v_updated_society
    FROM user_profiles
    WHERE society_name IS NOT NULL;

    RAISE NOTICE '✅ Migration complete';
    RAISE NOTICE '   - % profiles with home course', v_updated_home_course;
    RAISE NOTICE '   - % profiles with society', v_updated_society;
END $$;

COMMIT;

-- Verification query
SELECT
    'Migration Results' as status,
    COUNT(*) as total_profiles,
    COUNT(home_course_name) as profiles_with_home_course,
    COUNT(society_name) as profiles_with_society
FROM user_profiles;
