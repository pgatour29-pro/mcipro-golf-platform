-- Check Pete's FULL profile including HCP and Username

SELECT
    line_user_id,
    name,
    role,
    caddy_number,
    phone,
    email,
    home_club,
    home_course_name,
    society_name,
    language,
    profile_data->'handicap' as handicap,
    profile_data->'username' as username,
    profile_data->'userId' as user_id,
    profile_data->'golfInfo'->>'handicap' as handicap_from_golf_info,
    profile_data->'personalInfo' as personal_info,
    profile_data->'golfInfo' as golf_info,
    profile_data->'organizationInfo' as organization_info,
    created_at,
    updated_at
FROM user_profiles
WHERE name ILIKE '%Pete%';
