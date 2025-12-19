-- Find all users who should be Travellers Rest members

-- Check how many users have Travellers Rest in different fields
SELECT
    'clubAffiliation matches' as source,
    COUNT(*) as count
FROM public.user_profiles
WHERE profile_data->'golfInfo'->>'clubAffiliation' ILIKE '%Traveller%Rest%'

UNION ALL

SELECT
    'organizationInfo societyName matches' as source,
    COUNT(*) as count
FROM public.user_profiles
WHERE profile_data->'organizationInfo'->>'societyName' ILIKE '%Traveller%Rest%'

UNION ALL

SELECT
    'society_name column matches' as source,
    COUNT(*) as count
FROM public.user_profiles
WHERE society_name ILIKE '%Traveller%Rest%'

UNION ALL

SELECT
    'society_id matches' as source,
    COUNT(*) as count
FROM public.user_profiles
WHERE society_id = '7c0e4b72-d925-44bc-afda-38259a7ba346';

-- List ALL users with any Travellers Rest reference
SELECT
    name,
    line_user_id,
    society_name,
    society_id,
    profile_data->'golfInfo'->>'clubAffiliation' as club_affiliation,
    profile_data->'organizationInfo'->>'societyName' as org_society_name
FROM public.user_profiles
WHERE
    profile_data->'golfInfo'->>'clubAffiliation' ILIKE '%Traveller%'
    OR profile_data->'organizationInfo'->>'societyName' ILIKE '%Traveller%'
    OR society_name ILIKE '%Traveller%'
    OR society_id = '7c0e4b72-d925-44bc-afda-38259a7ba346'
ORDER BY name;
