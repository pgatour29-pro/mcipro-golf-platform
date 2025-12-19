-- =====================================================
-- DIAGNOSE AND FIX TODAY'S STABLEFORD POINTS
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Show all scorecards from today with player names
SELECT 'TODAY''S SCORECARDS' as info;
SELECT
    sc.id as scorecard_id,
    sc.player_id,
    up.name as player_name,
    sc.created_at,
    COUNT(s.hole_number) as holes_played,
    SUM(s.stableford_points) as total_stableford,
    SUM(CASE WHEN s.hole_number <= 9 THEN s.stableford_points ELSE 0 END) as front9,
    SUM(CASE WHEN s.hole_number > 9 THEN s.stableford_points ELSE 0 END) as back9
FROM scorecards sc
LEFT JOIN scores s ON s.scorecard_id = sc.id
LEFT JOIN user_profiles up ON up.line_user_id = sc.player_id
WHERE sc.created_at >= CURRENT_DATE
GROUP BY sc.id, sc.player_id, up.name, sc.created_at
ORDER BY sc.created_at DESC;

-- Step 2: Show detailed scores for each player (to see what's wrong)
SELECT 'DETAILED SCORES BY PLAYER' as info;
SELECT
    up.name as player_name,
    s.hole_number,
    s.par,
    s.gross_score,
    s.net_score,
    (s.net_score - s.par) as net_vs_par,
    s.stableford_points as current_stableford,
    CASE
        WHEN (s.net_score - s.par) <= -2 THEN 4
        WHEN (s.net_score - s.par) = -1 THEN 3
        WHEN (s.net_score - s.par) = 0 THEN 2
        WHEN (s.net_score - s.par) = 1 THEN 1
        ELSE 0
    END as correct_stableford
FROM scores s
JOIN scorecards sc ON sc.id = s.scorecard_id
LEFT JOIN user_profiles up ON up.line_user_id = sc.player_id
WHERE sc.created_at >= CURRENT_DATE
ORDER BY up.name, s.hole_number;

-- Step 3: FIX - Recalculate stableford_points for ALL scores from today's scorecards
SELECT 'FIXING STABLEFORD POINTS FOR TODAY' as info;
UPDATE scores s
SET stableford_points = CASE
    WHEN (s.net_score - s.par) <= -2 THEN 4  -- Net Eagle or better
    WHEN (s.net_score - s.par) = -1 THEN 3   -- Net Birdie
    WHEN (s.net_score - s.par) = 0 THEN 2    -- Net Par
    WHEN (s.net_score - s.par) = 1 THEN 1    -- Net Bogey
    ELSE 0                                    -- Net Double bogey or worse
END
WHERE s.scorecard_id IN (
    SELECT id FROM scorecards WHERE created_at >= CURRENT_DATE
);

-- Step 4: Show corrected totals
SELECT 'CORRECTED TOTALS' as info;
SELECT
    up.name as player_name,
    SUM(s.stableford_points) as total_stableford,
    SUM(CASE WHEN s.hole_number <= 9 THEN s.stableford_points ELSE 0 END) as front9,
    SUM(CASE WHEN s.hole_number > 9 THEN s.stableford_points ELSE 0 END) as back9,
    COUNT(s.hole_number) as holes
FROM scorecards sc
JOIN scores s ON s.scorecard_id = sc.id
LEFT JOIN user_profiles up ON up.line_user_id = sc.player_id
WHERE sc.created_at >= CURRENT_DATE
GROUP BY sc.player_id, up.name
ORDER BY total_stableford DESC;

SELECT 'DONE - Refresh live.html to see corrected scores' as status;
