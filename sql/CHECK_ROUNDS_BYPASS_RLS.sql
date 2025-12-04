-- ============================================================================
-- CHECK IF ROUNDS EXIST (BYPASS RLS)
-- ============================================================================
-- This checks if rounds are being saved but hidden by RLS policies
-- Run this as database owner/service role to bypass RLS
-- ============================================================================

-- Disable RLS temporarily to see ALL rounds
SET ROLE postgres; -- or your superuser role

-- Check current RLS status on rounds table
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'rounds';

-- Count ALL rounds in database (bypassing RLS)
SELECT COUNT(*) as total_rounds_in_database
FROM public.rounds;

-- Find Pete Park and Alan Thomas LINE user IDs
SELECT
    name,
    line_user_id,
    profile_data->'golfInfo'->>'handicap' AS current_handicap
FROM public.user_profiles
WHERE name ILIKE '%Pete%Park%' OR name ILIKE '%Alan%Thomas%';

-- Count rounds for each player (use actual LINE IDs from above)
-- Example for Pete Park (replace U2b6d976f19bca4b2f4374ae0e10ed873 with actual)
SELECT
    golfer_id,
    COUNT(*) as total_rounds,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_rounds,
    MIN(created_at) as first_round,
    MAX(created_at) as last_round
FROM public.rounds
WHERE golfer_id IN (
    SELECT line_user_id
    FROM public.user_profiles
    WHERE name ILIKE '%Pete%Park%' OR name ILIKE '%Alan%Thomas%'
)
GROUP BY golfer_id;

-- Show last 5 rounds for Pete/Alan to see what exists
SELECT
    r.id,
    r.golfer_id,
    u.name,
    r.course_name,
    r.total_gross,
    r.status,
    r.played_at,
    r.completed_at,
    r.created_at
FROM public.rounds r
LEFT JOIN public.user_profiles u ON r.golfer_id = u.line_user_id
WHERE r.golfer_id IN (
    SELECT line_user_id
    FROM public.user_profiles
    WHERE name ILIKE '%Pete%Park%' OR name ILIKE '%Alan%Thomas%'
)
ORDER BY r.created_at DESC
LIMIT 10;

-- Check what RLS policies exist on rounds table
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'rounds';

-- ============================================================================
-- WHAT TO LOOK FOR:
-- 1. If total_rounds > 0 but you can't see them in UI = RLS is blocking
-- 2. If Pete/Alan have rounds = handicap trigger has data to corrupt from
-- 3. If no rounds exist = something else is corrupting handicaps
-- ============================================================================
