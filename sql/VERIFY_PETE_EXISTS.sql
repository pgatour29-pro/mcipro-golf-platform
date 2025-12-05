-- Verify Pete Park exists in user_profiles
SELECT
    'PETE IN USER_PROFILES' as location,
    line_user_id,
    name,
    email,
    role,
    created_at
FROM public.user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- Check if there are duplicate Pete profiles
SELECT
    'ALL PETE PROFILES' as info,
    line_user_id,
    name,
    email,
    role,
    created_at
FROM public.user_profiles
WHERE name ILIKE '%Pete%Park%'
ORDER BY created_at;

-- Count total users in database
SELECT 'TOTAL USERS IN DATABASE' as info, COUNT(*) as count FROM public.user_profiles;
