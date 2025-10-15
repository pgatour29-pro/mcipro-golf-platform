-- =====================================================================
-- Check Pete Park's Profile Data
-- =====================================================================
-- This query displays Pete Park's profile data including society affiliation
-- and home course information.
-- =====================================================================

-- Check Pete Park's current profile data
SELECT
    'Pete Park Profile' as check_type,
    line_user_id,
    name,
    home_club as old_home_club_field,
    home_course_id,
    home_course_name,
    society_id,
    society_name,
    member_since,
    profile_data->'golfInfo'->>'homeClub' as homeClub_from_json,
    profile_data->'organizationInfo'->>'societyName' as societyName_from_json,
    created_at,
    updated_at
FROM user_profiles
WHERE name ILIKE '%Pete%' OR name ILIKE '%Park%'
ORDER BY created_at DESC;

-- Check all profiles to see overall structure
SELECT
    'Overall Statistics' as check_type,
    COUNT(*) as total_profiles,
    COUNT(society_id) as profiles_with_society_id,
    COUNT(society_name) as profiles_with_society_name,
    COUNT(home_course_id) as profiles_with_home_course_id,
    COUNT(home_course_name) as profiles_with_home_course_name,
    COUNT(home_club) as profiles_with_old_home_club
FROM user_profiles;

-- Check if Pete has data in JSONB that needs migration
SELECT
    'Pete JSONB Data' as check_type,
    name,
    profile_data->'golfInfo' as golf_info,
    profile_data->'organizationInfo' as organization_info
FROM user_profiles
WHERE name ILIKE '%Pete%' OR name ILIKE '%Park%';
