-- Find ALL Pete Park profiles
SELECT
    line_user_id,
    name,
    email,
    role,
    created_at
FROM public.user_profiles
WHERE name ILIKE '%Pete%Park%'
ORDER BY created_at;

-- Delete the duplicate (keep the one with real LINE ID)
DELETE FROM public.user_profiles
WHERE name ILIKE '%Pete%Park%'
  AND line_user_id != 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- Verify only one Pete Park remains
SELECT
    'REMAINING PETE PROFILES' as status,
    COUNT(*) as count
FROM public.user_profiles
WHERE name ILIKE '%Pete%Park%';

-- Show the remaining profile
SELECT
    line_user_id,
    name,
    email,
    role,
    profile_data->'golfInfo'->>'handicap' as handicap
FROM public.user_profiles
WHERE name ILIKE '%Pete%Park%';
