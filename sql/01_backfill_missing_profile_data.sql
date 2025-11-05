-- =====================================================================
-- BACKFILL MISSING PROFILE DATA - Achieve 100% Data Completeness
-- =====================================================================
-- Date: 2025-11-05
-- Purpose: Fill in missing fields for existing user profiles
-- =====================================================================

BEGIN;

-- =====================================================
-- STEP 1: Backfill empty profile_data JSONB fields
-- =====================================================

UPDATE user_profiles
SET profile_data = jsonb_build_object(
    'username', COALESCE(username, name, line_user_id),
    'linePictureUrl', '',
    'personalInfo', jsonb_build_object(
        'firstName', COALESCE(SPLIT_PART(name, ' ', 1), ''),
        'lastName', COALESCE(SPLIT_PART(name, ' ', 2), ''),
        'email', COALESCE(email, ''),
        'phone', COALESCE(phone, '')
    ),
    'golfInfo', jsonb_build_object(
        'handicap', COALESCE((profile_data->>'handicap')::numeric, 0),
        'homeClub', COALESCE(home_course_name, home_club, ''),
        'homeCourseId', COALESCE(home_course_id::text, ''),
        'experienceLevel', 'intermediate',
        'playingStyle', 'casual'
    ),
    'professionalInfo', jsonb_build_object(),
    'skills', jsonb_build_object(),
    'preferences', jsonb_build_object(
        'language', COALESCE(language, 'en')
    ),
    'media', jsonb_build_object(),
    'privacy', jsonb_build_object()
)
WHERE profile_data::text = '{}' OR profile_data IS NULL;

-- =====================================================
-- STEP 2: Sync flat columns to profile_data for existing records
-- =====================================================

UPDATE user_profiles
SET profile_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            profile_data,
            '{personalInfo,email}',
            to_jsonb(COALESCE(email, ''))
        ),
        '{personalInfo,phone}',
        to_jsonb(COALESCE(phone, ''))
    ),
    '{golfInfo,homeClub}',
    to_jsonb(COALESCE(home_course_name, home_club, ''))
)
WHERE email IS NOT NULL
   OR phone IS NOT NULL
   OR home_course_name IS NOT NULL;

-- =====================================================
-- STEP 3: Backfill missing home_course data from society_members
-- =====================================================

-- Update home_course_name from society primary membership
UPDATE user_profiles up
SET
    society_name = sm.society_name,
    society_id = (
        SELECT id FROM society_profiles sp
        WHERE sp.society_name = sm.society_name
        LIMIT 1
    )
FROM society_members sm
WHERE up.line_user_id = sm.golfer_id
  AND sm.is_primary_society = true
  AND (up.society_name IS NULL OR up.society_name = '');

-- =====================================================
-- STEP 4: Sync member_data from society_members to profile_data
-- =====================================================

UPDATE user_profiles up
SET profile_data = jsonb_set(
    profile_data,
    '{golfInfo,handicap}',
    COALESCE(
        (sm.member_data->>'handicap')::jsonb,
        (profile_data->'golfInfo'->>'handicap')::jsonb,
        '0'::jsonb
    )
)
FROM society_members sm
WHERE up.line_user_id = sm.golfer_id
  AND sm.member_data->>'handicap' IS NOT NULL;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Show data completeness summary
SELECT
    'Data Completeness Summary' as report,
    COUNT(*) as total_profiles,
    COUNT(*) FILTER (WHERE profile_data::text != '{}') as profiles_with_data,
    COUNT(*) FILTER (WHERE home_course_id IS NOT NULL) as profiles_with_home_course,
    COUNT(*) FILTER (WHERE society_name IS NOT NULL) as profiles_with_society,
    COUNT(*) FILTER (WHERE phone IS NOT NULL) as profiles_with_phone,
    COUNT(*) FILTER (WHERE email IS NOT NULL) as profiles_with_email,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE profile_data::text != '{}') / COUNT(*),
        2
    ) as completeness_percentage
FROM user_profiles;

-- Show profiles that still need attention
SELECT
    'Profiles Needing Attention' as report,
    line_user_id,
    name,
    role,
    CASE WHEN profile_data::text = '{}' THEN '❌' ELSE '✅' END as has_profile_data,
    CASE WHEN home_course_id IS NOT NULL THEN '✅' ELSE '⚠️' END as has_home_course,
    CASE WHEN society_name IS NOT NULL THEN '✅' ELSE '⚠️' END as has_society,
    CASE WHEN phone IS NOT NULL THEN '✅' ELSE '⚠️' END as has_phone
FROM user_profiles
WHERE profile_data::text = '{}'
   OR home_course_id IS NULL
   OR society_name IS NULL
ORDER BY created_at DESC
LIMIT 20;

COMMIT;

-- Success message
DO $$
DECLARE
    updated_count INT;
BEGIN
    SELECT COUNT(*) INTO updated_count
    FROM user_profiles
    WHERE updated_at > NOW() - INTERVAL '10 seconds';

    RAISE NOTICE '✅ BACKFILL COMPLETE!';
    RAISE NOTICE '   - Updated % profile(s)', updated_count;
    RAISE NOTICE '   - Synced flat columns → profile_data JSONB';
    RAISE NOTICE '   - Backfilled home_course and society data';
    RAISE NOTICE '   - Run verification queries above to check results';
END $$;
