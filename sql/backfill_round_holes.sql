-- Backfill round_holes from scores table for ALL rounds missing hole-by-hole data
-- Run this in Supabase SQL Editor
-- Created: 2025-12-17

-- ============================================
-- STEP 1: DIAGNOSTIC - Check the situation
-- ============================================

-- 1a. How many rounds exist and how many have hole data?
SELECT
    'Total completed rounds' as metric,
    COUNT(*) as count
FROM rounds WHERE status = 'completed'
UNION ALL
SELECT
    'Rounds WITH hole-by-hole data',
    COUNT(DISTINCT round_id)
FROM round_holes
UNION ALL
SELECT
    'Rounds MISSING hole-by-hole data',
    (SELECT COUNT(*) FROM rounds WHERE status = 'completed') - COUNT(DISTINCT round_id)
FROM round_holes;

-- 1b. Check if scores table has data
SELECT
    'Total scorecards' as metric, COUNT(*) as count FROM scorecards
UNION ALL
SELECT
    'Total scores records', COUNT(*) FROM scores
UNION ALL
SELECT
    'Scorecards with scores', COUNT(DISTINCT scorecard_id) FROM scores WHERE gross_score > 0;

-- 1c. Show rounds missing hole data
SELECT
    r.id as round_id,
    r.golfer_id,
    up.display_name,
    r.course_name,
    r.total_gross,
    r.total_stableford,
    r.society_event_id,
    r.completed_at::date as played_date
FROM rounds r
LEFT JOIN user_profiles up ON up.line_user_id = r.golfer_id
WHERE r.status = 'completed'
AND NOT EXISTS (SELECT 1 FROM round_holes rh WHERE rh.round_id = r.id)
ORDER BY r.completed_at DESC;

-- ============================================
-- STEP 2: BACKFILL - Multiple matching strategies
-- ============================================

-- Strategy A: Match by golfer_id AND event_id (most reliable for society events)
INSERT INTO round_holes (round_id, hole_number, par, stroke_index, gross_score, net_score, stableford_points, handicap_strokes)
SELECT DISTINCT ON (r.id, s.hole_number)
    r.id as round_id,
    s.hole_number,
    COALESCE(s.par, ch.par, 4) as par,
    COALESCE(ch.stroke_index, s.hole_number) as stroke_index,
    s.gross_score,
    COALESCE(s.net_score, s.gross_score) as net_score,
    COALESCE(s.stableford_points, 0) as stableford_points,
    0 as handicap_strokes
FROM rounds r
JOIN scorecards sc ON sc.player_id::text = r.golfer_id::text AND sc.event_id::text = r.society_event_id::text
JOIN scores s ON s.scorecard_id = sc.id AND s.gross_score > 0
LEFT JOIN course_holes ch ON ch.course_id::text = r.course_id::text AND ch.hole_number = s.hole_number
WHERE r.status = 'completed'
AND r.society_event_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM round_holes rh WHERE rh.round_id = r.id)
ORDER BY r.id, s.hole_number, sc.created_at DESC;

-- Strategy B: Match by golfer_id and similar date (for private rounds)
INSERT INTO round_holes (round_id, hole_number, par, stroke_index, gross_score, net_score, stableford_points, handicap_strokes)
SELECT DISTINCT ON (r.id, s.hole_number)
    r.id as round_id,
    s.hole_number,
    COALESCE(s.par, ch.par, 4) as par,
    COALESCE(ch.stroke_index, s.hole_number) as stroke_index,
    s.gross_score,
    COALESCE(s.net_score, s.gross_score) as net_score,
    COALESCE(s.stableford_points, 0) as stableford_points,
    0 as handicap_strokes
FROM rounds r
JOIN scorecards sc ON sc.player_id::text = r.golfer_id::text
    AND sc.created_at::date = r.played_at::date
JOIN scores s ON s.scorecard_id = sc.id AND s.gross_score > 0
LEFT JOIN course_holes ch ON ch.course_id::text = r.course_id::text AND ch.hole_number = s.hole_number
WHERE r.status = 'completed'
AND r.society_event_id IS NULL
AND NOT EXISTS (SELECT 1 FROM round_holes rh WHERE rh.round_id = r.id)
ORDER BY r.id, s.hole_number, sc.created_at DESC;

-- Strategy C: Match by golfer_id and total score (fallback for any remaining)
INSERT INTO round_holes (round_id, hole_number, par, stroke_index, gross_score, net_score, stableford_points, handicap_strokes)
SELECT DISTINCT ON (r.id, s.hole_number)
    r.id as round_id,
    s.hole_number,
    COALESCE(s.par, ch.par, 4) as par,
    COALESCE(ch.stroke_index, s.hole_number) as stroke_index,
    s.gross_score,
    COALESCE(s.net_score, s.gross_score) as net_score,
    COALESCE(s.stableford_points, 0) as stableford_points,
    0 as handicap_strokes
FROM rounds r
JOIN scorecards sc ON sc.player_id::text = r.golfer_id::text
JOIN scores s ON s.scorecard_id = sc.id AND s.gross_score > 0
LEFT JOIN course_holes ch ON ch.course_id::text = r.course_id::text AND ch.hole_number = s.hole_number
WHERE r.status = 'completed'
AND NOT EXISTS (SELECT 1 FROM round_holes rh WHERE rh.round_id = r.id)
AND (
    -- Match if total scores are similar (within 2 strokes)
    ABS(r.total_gross - (SELECT SUM(s2.gross_score) FROM scores s2 WHERE s2.scorecard_id = sc.id)) <= 2
)
ORDER BY r.id, s.hole_number, ABS(r.completed_at - sc.created_at);

-- ============================================
-- STEP 3: VERIFY RESULTS
-- ============================================

-- Check how many rounds now have hole data
SELECT
    'Rounds now WITH hole-by-hole data' as metric,
    COUNT(DISTINCT round_id) as count
FROM round_holes;

-- Show any remaining rounds without hole data
SELECT
    r.id as round_id,
    r.golfer_id,
    up.display_name,
    r.course_name,
    r.total_gross,
    r.completed_at::date as played_date,
    'NO MATCHING SCORES FOUND' as status
FROM rounds r
LEFT JOIN user_profiles up ON up.line_user_id = r.golfer_id
WHERE r.status = 'completed'
AND NOT EXISTS (SELECT 1 FROM round_holes rh WHERE rh.round_id = r.id)
ORDER BY r.completed_at DESC;

-- Show sample of successfully backfilled data
SELECT
    r.id as round_id,
    up.display_name,
    r.course_name,
    r.total_gross,
    r.completed_at::date,
    COUNT(rh.id) as holes_filled
FROM rounds r
JOIN round_holes rh ON rh.round_id = r.id
LEFT JOIN user_profiles up ON up.line_user_id = r.golfer_id
GROUP BY r.id, up.display_name, r.course_name, r.total_gross, r.completed_at
ORDER BY r.completed_at DESC
LIMIT 20;
