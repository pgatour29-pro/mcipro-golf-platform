-- ============================================================================
-- CHECK PETE'S CURRENT STATUS
-- ============================================================================

-- Check if Pete's profile exists
SELECT
    'PETE PROFILE' as check_type,
    line_user_id,
    name,
    email,
    profile_data->'golfInfo'->>'handicap' as handicap
FROM public.user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- Check if Pete has any rounds
SELECT
    'PETE ROUNDS' as check_type,
    COUNT(*) as round_count
FROM public.rounds
WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- Show Pete's actual rounds
SELECT
    'PETE ROUND DETAILS' as check_type,
    course_name,
    total_gross,
    DATE(played_at) as played_date,
    created_at
FROM public.rounds
WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
ORDER BY played_at DESC;

-- Check society memberships
SELECT
    'PETE SOCIETIES' as check_type,
    COUNT(*) as membership_count
FROM public.society_members
WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';
