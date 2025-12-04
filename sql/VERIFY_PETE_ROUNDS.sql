-- ============================================================================
-- VERIFY PETE'S ROUNDS
-- ============================================================================

-- Check Pete's current profile
SELECT
    line_user_id,
    name,
    profile_data->'golfInfo'->>'handicap' as handicap,
    created_at
FROM public.user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- Check if guest profile still exists
SELECT
    line_user_id,
    name,
    profile_data->'golfInfo'->>'handicap' as handicap
FROM public.user_profiles
WHERE line_user_id = 'TRGG-GUEST-0793';

-- Check rounds under Pete's real LINE ID
SELECT
    id,
    golfer_id,
    course_name,
    total_gross,
    played_at,
    created_at
FROM public.rounds
WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
ORDER BY created_at DESC;

-- Check if any rounds are still under guest ID
SELECT
    id,
    golfer_id,
    course_name,
    total_gross,
    played_at,
    created_at
FROM public.rounds
WHERE golfer_id = 'TRGG-GUEST-0793'
ORDER BY created_at DESC;

-- Check ALL of Pete's rounds (in case golfer_id doesn't match exactly)
SELECT
    golfer_id,
    COUNT(*) as round_count,
    MIN(played_at) as first_round,
    MAX(played_at) as last_round
FROM public.rounds
WHERE
    golfer_id LIKE '%2b6d976f19bca4b2f4374ae0e10ed873%'
    OR golfer_id = 'TRGG-GUEST-0793'
GROUP BY golfer_id;

-- ============================================================================
-- This will show us if Pete has any rounds and under which golfer_id
-- ============================================================================
