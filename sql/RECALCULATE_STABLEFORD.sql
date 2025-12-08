-- =====================================================
-- RECALCULATE STABLEFORD POINTS FOR ALL SCORES
-- Run this in Supabase SQL Editor
-- This fixes the issue where stableford_points was not being saved
-- =====================================================

-- First, show current state
SELECT 'CURRENT STATE' as info;
SELECT
    COUNT(*) as total_scores,
    COUNT(stableford_points) as scores_with_stableford,
    COUNT(*) - COUNT(stableford_points) as scores_missing_stableford
FROM scores;

-- Recalculate stableford_points for ALL scores based on net_score vs par
-- Standard Stableford: Net Eagle+=4, Net Birdie=3, Net Par=2, Net Bogey=1, Net Double+=0
-- Note: Previous calculation was wrong (double-counting handicap), so we recalc ALL
UPDATE scores
SET stableford_points = CASE
    WHEN (net_score - par) <= -2 THEN 4  -- Net Eagle or better
    WHEN (net_score - par) = -1 THEN 3   -- Net Birdie
    WHEN (net_score - par) = 0 THEN 2    -- Net Par
    WHEN (net_score - par) = 1 THEN 1    -- Net Bogey
    ELSE 0                                -- Net Double bogey or worse
END;

-- Show results
SELECT 'AFTER RECALCULATION' as info;
SELECT
    COUNT(*) as total_scores,
    COUNT(stableford_points) as scores_with_stableford,
    SUM(CASE WHEN stableford_points > 0 THEN 1 ELSE 0 END) as scores_with_points,
    ROUND(AVG(stableford_points), 2) as avg_stableford
FROM scores;

-- Show sample of updated scores
SELECT 'SAMPLE SCORES' as info;
SELECT
    scorecard_id,
    hole_number,
    par,
    gross_score,
    net_score,
    (net_score - par) as net_vs_par,
    stableford_points
FROM scores
WHERE stableford_points IS NOT NULL
ORDER BY scorecard_id, hole_number
LIMIT 20;

SELECT '✅ STABLEFORD RECALCULATION COMPLETE' as status;
