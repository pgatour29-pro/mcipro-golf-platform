-- Check Pete Park's current profile status

-- 1. Check all Pete Park profiles
SELECT
    'ALL PETE PROFILES' as info,
    line_user_id,
    name,
    email,
    role,
    created_at,
    updated_at
FROM public.user_profiles
WHERE name ILIKE '%Pete%Park%'
ORDER BY created_at;

-- 2. Check profile with real LINE ID
SELECT
    'PETE WITH REAL LINE ID' as info,
    line_user_id,
    name,
    email,
    role,
    profile_data->'golfInfo'->>'handicap' as handicap,
    profile_data->'golfInfo'->>'homeClub' as home_club,
    created_at,
    updated_at
FROM public.user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- 3. Check for any guest profiles still existing for Pete
SELECT
    'PETE GUEST PROFILES' as info,
    line_user_id,
    name,
    email,
    role,
    created_at
FROM public.user_profiles
WHERE line_user_id LIKE 'TRGG-GUEST%'
  AND name ILIKE '%Pete%Park%';

-- 4. Count Pete's rounds
SELECT
    'PETE ROUNDS COUNT' as info,
    COUNT(*) as count
FROM public.rounds
WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- 5. Total users in database
SELECT
    'TOTAL USERS' as info,
    COUNT(*) as count
FROM public.user_profiles;

-- 6. Check if there are duplicate Pete profiles by name
SELECT
    'DUPLICATE CHECK' as info,
    name,
    COUNT(*) as count
FROM public.user_profiles
WHERE name ILIKE '%Pete%Park%'
GROUP BY name
HAVING COUNT(*) > 1;
