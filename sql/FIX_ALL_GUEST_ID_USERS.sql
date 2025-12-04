-- ============================================================================
-- FIX ALL USERS WITH GUEST IDs - COMPREHENSIVE CLEANUP
-- ============================================================================
-- This script finds ALL users with guest IDs and helps fix them
-- ============================================================================

-- STEP 1: Find all users with TRGG-GUEST IDs
SELECT
    line_user_id,
    name,
    email,
    profile_data->'golfInfo'->>'handicap' as handicap,
    created_at
FROM public.user_profiles
WHERE line_user_id LIKE 'TRGG-GUEST%'
ORDER BY created_at DESC;

-- STEP 2: Check if these users have real LINE profiles (duplicates)
WITH guest_users AS (
    SELECT line_user_id AS guest_id, name
    FROM public.user_profiles
    WHERE line_user_id LIKE 'TRGG-GUEST%'
)
SELECT
    gu.guest_id,
    gu.name AS guest_name,
    up.line_user_id AS real_line_id,
    up.name AS real_name,
    up.profile_data->'golfInfo'->>'handicap' as handicap
FROM guest_users gu
JOIN public.user_profiles up ON up.name ILIKE '%' || gu.name || '%'
WHERE up.line_user_id LIKE 'U%' -- Real LINE IDs start with U
ORDER BY gu.guest_id;

-- STEP 3: Check how many rounds each guest ID has
SELECT
    golfer_id,
    COUNT(*) as round_count,
    MIN(played_at) as first_round,
    MAX(played_at) as last_round
FROM public.rounds
WHERE golfer_id LIKE 'TRGG-GUEST%'
GROUP BY golfer_id
ORDER BY round_count DESC;

-- STEP 4: Check society memberships with guest IDs
SELECT
    sm.golfer_id,
    sm.society_id,
    up.name,
    sm.status,
    sm.joined_at
FROM public.society_members sm
LEFT JOIN public.user_profiles up ON up.line_user_id = sm.golfer_id
WHERE sm.golfer_id LIKE 'TRGG-GUEST%'
ORDER BY sm.society_id, up.name;

-- ============================================================================
-- MANUAL FIX INSTRUCTIONS:
-- For each guest ID found above:
-- 1. Find their real LINE user ID (from LOGIN or user_profiles where line_user_id LIKE 'U%')
-- 2. Run the migration commands below (replace GUEST_ID and REAL_LINE_ID)
-- ============================================================================

-- TEMPLATE: Fix a single user (uncomment and fill in values)
-- UPDATE public.rounds SET golfer_id = 'REAL_LINE_ID' WHERE golfer_id = 'GUEST_ID';
-- UPDATE public.scorecards SET player_id = 'REAL_LINE_ID' WHERE player_id = 'GUEST_ID';
-- UPDATE public.event_registrations SET player_id = 'REAL_LINE_ID' WHERE player_id = 'GUEST_ID';
-- UPDATE public.society_members SET golfer_id = 'REAL_LINE_ID' WHERE golfer_id = 'GUEST_ID';
-- UPDATE public.event_join_requests SET golfer_id = 'REAL_LINE_ID' WHERE golfer_id = 'GUEST_ID';
-- UPDATE public.golf_buddies SET buddy_id = 'REAL_LINE_ID' WHERE buddy_id = 'GUEST_ID';
-- UPDATE public.golf_buddies SET user_id = 'REAL_LINE_ID' WHERE user_id = 'GUEST_ID';
-- DELETE FROM public.user_profiles WHERE line_user_id = 'GUEST_ID';

-- ============================================================================
-- PREVENTION: How to stop this from happening
-- ============================================================================
-- When adding members to societies, ALWAYS use their real LINE user ID from login
-- If they don't have a LINE account yet, they should NOT be added to user_profiles
-- Only add to society_members with a placeholder ID, then update when they login
-- ============================================================================
