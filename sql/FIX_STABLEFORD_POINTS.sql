-- =====================================================
-- FIX STABLEFORD POINTS FOR ALL EXISTING SCORES
-- =====================================================
-- The old algorithm incorrectly used "combined nines" detection
-- which caused inconsistent handicap stroke allocation.
-- This script recalculates stableford_points using the correct algorithm.
--
-- Run this in Supabase SQL Editor

-- Step 1: Create a function to recalculate stableford points
CREATE OR REPLACE FUNCTION recalculate_stableford_points()
RETURNS TABLE (
    updated_count INTEGER,
    sample_updates JSON
) AS $$
DECLARE
    v_updated_count INTEGER := 0;
    v_sample_updates JSON;
BEGIN
    -- Update all scores with recalculated stableford points
    -- Formula:
    -- 1. Get handicap from scorecard
    -- 2. Calculate strokes received: floor(handicap/18) + (SI <= handicap%18 ? 1 : 0)
    -- 3. Net score = gross_score - strokes_received
    -- 4. Score to par = net_score - par
    -- 5. Stableford: <= -2 = 4pts, -1 = 3pts, 0 = 2pts, 1 = 1pt, else = 0pts

    WITH recalculated AS (
        SELECT
            s.scorecard_id,
            s.hole_number,
            s.gross_score,
            s.par,
            s.stroke_index,
            sc.handicap,
            sc.playing_handicap,
            -- Use playing_handicap if available, otherwise handicap
            COALESCE(sc.playing_handicap, sc.handicap, 0) as effective_handicap,
            -- Calculate strokes received using correct algorithm
            FLOOR(ABS(COALESCE(sc.playing_handicap, sc.handicap, 0))::numeric / 18) +
                CASE
                    WHEN COALESCE(sc.playing_handicap, sc.handicap, 0) >= 0
                         AND s.stroke_index <= (ABS(COALESCE(sc.playing_handicap, sc.handicap, 0))::integer % 18)
                    THEN 1
                    WHEN COALESCE(sc.playing_handicap, sc.handicap, 0) < 0
                         AND s.stroke_index > (18 - (ABS(COALESCE(sc.playing_handicap, sc.handicap, 0))::integer % 18))
                    THEN -1
                    ELSE 0
                END as calculated_strokes,
            s.stableford_points as old_stableford
        FROM scores s
        JOIN scorecards sc ON sc.id = s.scorecard_id
        WHERE s.gross_score IS NOT NULL AND s.par IS NOT NULL
    ),
    with_net AS (
        SELECT
            *,
            gross_score - calculated_strokes as net_score,
            (gross_score - calculated_strokes) - par as score_to_par
        FROM recalculated
    ),
    with_new_stableford AS (
        SELECT
            *,
            CASE
                WHEN score_to_par <= -2 THEN 4  -- Net Eagle or better
                WHEN score_to_par = -1 THEN 3  -- Net Birdie
                WHEN score_to_par = 0 THEN 2   -- Net Par
                WHEN score_to_par = 1 THEN 1   -- Net Bogey
                ELSE 0                          -- Net Double bogey or worse
            END as new_stableford
        FROM with_net
    )
    UPDATE scores s
    SET
        stableford_points = ws.new_stableford,
        handicap_strokes = ws.calculated_strokes,
        net_score = ws.net_score
    FROM with_new_stableford ws
    WHERE s.scorecard_id = ws.scorecard_id
      AND s.hole_number = ws.hole_number
      AND (s.stableford_points IS DISTINCT FROM ws.new_stableford
           OR s.handicap_strokes IS DISTINCT FROM ws.calculated_strokes
           OR s.net_score IS DISTINCT FROM ws.net_score);

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    -- Get sample of what was updated for verification
    SELECT json_agg(sample) INTO v_sample_updates
    FROM (
        SELECT
            s.scorecard_id,
            s.hole_number,
            s.gross_score,
            s.par,
            s.stroke_index,
            s.net_score,
            s.handicap_strokes,
            s.stableford_points,
            sc.player_name,
            sc.handicap
        FROM scores s
        JOIN scorecards sc ON sc.id = s.scorecard_id
        ORDER BY s.scorecard_id, s.hole_number
        LIMIT 10
    ) sample;

    RETURN QUERY SELECT v_updated_count, v_sample_updates;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Run the recalculation
SELECT * FROM recalculate_stableford_points();

-- Step 3: Verify a sample of the results
SELECT
    sc.player_name,
    sc.handicap,
    sc.playing_handicap,
    s.hole_number,
    s.stroke_index,
    s.gross_score,
    s.par,
    s.handicap_strokes,
    s.net_score,
    s.stableford_points,
    (s.gross_score - s.handicap_strokes) as calc_net,
    ((s.gross_score - s.handicap_strokes) - s.par) as score_to_par
FROM scores s
JOIN scorecards sc ON sc.id = s.scorecard_id
WHERE sc.created_at >= '2025-12-01'
ORDER BY sc.player_name, s.hole_number
LIMIT 50;

-- Step 4: Check total stableford per player matches
SELECT
    sc.player_name,
    sc.handicap,
    COUNT(s.hole_number) as holes_played,
    SUM(s.gross_score) as total_gross,
    SUM(s.net_score) as total_net,
    SUM(s.stableford_points) as total_stableford
FROM scorecards sc
JOIN scores s ON s.scorecard_id = sc.id
WHERE sc.created_at >= '2025-12-01'
GROUP BY sc.id, sc.player_name, sc.handicap
ORDER BY sc.player_name;

-- Step 5: Clean up the function (optional - keep for future use)
-- DROP FUNCTION IF EXISTS recalculate_stableford_points();
