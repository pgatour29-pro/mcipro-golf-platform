-- ============================================================================
-- RESTORE PETE PARK PROFILE IMMEDIATELY
-- ============================================================================

-- First check if profile exists
SELECT 'CHECKING PETE PROFILE' as status;
SELECT * FROM public.user_profiles WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- Check if profile exists by name
SELECT * FROM public.user_profiles WHERE name ILIKE '%Pete%Park%';

-- If profile doesn't exist, recreate it
INSERT INTO public.user_profiles (
    line_user_id,
    name,
    email,
    role,
    profile_data,
    created_at,
    updated_at
)
VALUES (
    'U2b6d976f19bca4b2f4374ae0e10ed873',
    'Pete Park',
    'pete@example.com',
    'admin',
    jsonb_build_object(
        'golfInfo', jsonb_build_object(
            'handicap', 3.8,
            'homeClub', 'Pattaya CC Golf'
        ),
        'personalInfo', jsonb_build_object(
            'firstName', 'Pete',
            'lastName', 'Park',
            'email', 'pete@example.com'
        ),
        'username', '007'
    ),
    NOW(),
    NOW()
)
ON CONFLICT (line_user_id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    profile_data = EXCLUDED.profile_data,
    updated_at = NOW();

-- Verify restoration
SELECT 'PETE PROFILE RESTORED' as status;
SELECT
    line_user_id,
    name,
    email,
    role,
    profile_data->'golfInfo'->>'handicap' as handicap
FROM public.user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- Verify rounds still exist
SELECT 'PETE ROUNDS STILL EXIST' as status, COUNT(*) as round_count
FROM public.rounds
WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';
