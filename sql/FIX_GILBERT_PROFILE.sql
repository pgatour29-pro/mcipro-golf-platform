-- ============================================================================
-- FIX GILBERT'S PROFILE
-- ============================================================================
-- Problem: Gilbert has TRGG-GUEST-0319 as his line_user_id
-- Solution: Find his real LINE ID and update or merge profiles
-- ============================================================================

-- STEP 1: Check all Gilbert/Tristan profiles
SELECT
    line_user_id,
    name,
    email,
    profile_data->'golfInfo'->>'handicap' as handicap,
    created_at
FROM public.user_profiles
WHERE
    name ILIKE '%Gilbert%'
    OR name ILIKE '%Tristan%'
    OR line_user_id = 'TRGG-GUEST-0319'
ORDER BY created_at DESC;

-- STEP 2: Check if Gilbert has rounds under a different ID
SELECT DISTINCT
    golfer_id,
    COUNT(*) as round_count
FROM public.rounds
WHERE
    golfer_id LIKE '%Gilbert%'
    OR golfer_id LIKE '%Tristan%'
    OR golfer_id IN (
        SELECT line_user_id
        FROM public.user_profiles
        WHERE name ILIKE '%Gilbert%' OR name ILIKE '%Tristan%'
    )
GROUP BY golfer_id;

-- ============================================================================
-- NEXT STEPS:
-- 1. Run this query to see Gilbert's profiles
-- 2. If Gilbert has a real LINE profile (U...), update TRGG-GUEST-0319 records to use it
-- 3. If Gilbert only has TRGG-GUEST-0319, wait for him to login with LINE to get real ID
-- ============================================================================

-- IF GILBERT HAS A REAL LINE ID, uncomment and run these (replace GILBERT_REAL_LINE_ID):
-- UPDATE public.rounds SET golfer_id = 'GILBERT_REAL_LINE_ID' WHERE golfer_id = 'TRGG-GUEST-0319';
-- UPDATE public.scorecards SET player_id = 'GILBERT_REAL_LINE_ID' WHERE player_id = 'TRGG-GUEST-0319';
-- UPDATE public.event_registrations SET player_id = 'GILBERT_REAL_LINE_ID' WHERE player_id = 'TRGG-GUEST-0319';
-- UPDATE public.society_members SET golfer_id = 'GILBERT_REAL_LINE_ID' WHERE golfer_id = 'TRGG-GUEST-0319';
-- UPDATE public.event_join_requests SET golfer_id = 'GILBERT_REAL_LINE_ID' WHERE golfer_id = 'TRGG-GUEST-0319';
-- DELETE FROM public.user_profiles WHERE line_user_id = 'TRGG-GUEST-0319';
