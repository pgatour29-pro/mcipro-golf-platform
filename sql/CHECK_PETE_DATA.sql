-- Check where Pete's society data is stored

SELECT
    name,
    home_club,
    home_course_name,
    society_name,
    profile_data->'organizationInfo' as organization_info,
    profile_data->'golfInfo' as golf_info,
    profile_data
FROM user_profiles
WHERE name ILIKE '%Pete%';
