-- =====================================================================
-- SCORE VERIFICATION AND FIX SYSTEM
-- =====================================================================
-- This script verifies all stableford scores against correct course data
-- and fixes any discrepancies caused by incorrect stroke index data
-- Run this in Supabase SQL Editor
-- =====================================================================

-- =====================================================================
-- STEP 1: FIX ROYAL LAKESIDE STROKE INDEX DATA FIRST
-- =====================================================================
UPDATE course_holes
SET stroke_index = CASE hole_number
    WHEN 1 THEN 7
    WHEN 2 THEN 3
    WHEN 3 THEN 17
    WHEN 4 THEN 13
    WHEN 5 THEN 5
    WHEN 6 THEN 15
    WHEN 7 THEN 9
    WHEN 8 THEN 1
    WHEN 9 THEN 11
    WHEN 10 THEN 12
    WHEN 11 THEN 8
    WHEN 12 THEN 16
    WHEN 13 THEN 6
    WHEN 14 THEN 4
    WHEN 15 THEN 18
    WHEN 16 THEN 2
    WHEN 17 THEN 14
    WHEN 18 THEN 10
END
WHERE course_id = 'royal_lakeside';

-- =====================================================================
-- STEP 2: CREATE FUNCTION TO CALCULATE CORRECT STABLEFORD POINTS
-- =====================================================================
CREATE OR REPLACE FUNCTION calculate_stableford_points(
    p_gross_score INT,
    p_par INT,
    p_handicap NUMERIC,
    p_stroke_index INT
) RETURNS INT AS $$
DECLARE
    rounded_hcp INT;
    full_strokes INT;
    remaining_strokes INT;
    shots_received INT;
    net_score INT;
    score_to_par INT;
BEGIN
    -- CRITICAL: Round handicap to integer first (2.8 -> 3, not truncate to 2)
    -- This matches the JavaScript: Math.round(handicap)
    rounded_hcp := ROUND(p_handicap)::INT;

    -- Calculate shots received on this hole
    full_strokes := FLOOR(rounded_hcp / 18);
    remaining_strokes := rounded_hcp % 18;

    IF p_stroke_index <= remaining_strokes THEN
        shots_received := full_strokes + 1;
    ELSE
        shots_received := full_strokes;
    END IF;

    -- Handle plus handicaps (negative)
    IF p_handicap < 0 THEN
        rounded_hcp := ROUND(ABS(p_handicap))::INT;
        full_strokes := FLOOR(rounded_hcp / 18);
        remaining_strokes := rounded_hcp % 18;
        IF p_stroke_index > (18 - remaining_strokes) THEN
            shots_received := -(full_strokes + 1);
        ELSE
            shots_received := -full_strokes;
        END IF;
    END IF;

    -- Calculate net score and stableford points
    net_score := p_gross_score - shots_received;
    score_to_par := net_score - p_par;

    -- Stableford points
    IF score_to_par <= -2 THEN RETURN 4;      -- Net Eagle or better
    ELSIF score_to_par = -1 THEN RETURN 3;    -- Net Birdie
    ELSIF score_to_par = 0 THEN RETURN 2;     -- Net Par
    ELSIF score_to_par = 1 THEN RETURN 1;     -- Net Bogey
    ELSE RETURN 0;                             -- Net Double or worse
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- STEP 3: FIND ALL SCORE DISCREPANCIES
-- =====================================================================
-- This shows all holes where the stored stableford points don't match
-- what they should be based on correct course data

WITH score_check AS (
    SELECT
        rh.id as round_hole_id,
        r.id as round_id,
        r.golfer_id,
        up.display_name,
        r.course_name,
        r.handicap_used,
        rh.hole_number,
        rh.par as stored_par,
        ch.par as correct_par,
        rh.stroke_index as stored_si,
        ch.stroke_index as correct_si,
        rh.gross_score,
        rh.stableford_points as stored_points,
        calculate_stableford_points(
            rh.gross_score,
            COALESCE(ch.par, rh.par),
            r.handicap_used,
            COALESCE(ch.stroke_index, rh.stroke_index)
        ) as correct_points
    FROM round_holes rh
    JOIN rounds r ON r.id = rh.round_id
    LEFT JOIN user_profiles up ON up.line_user_id = r.golfer_id
    LEFT JOIN course_holes ch ON ch.course_id = (
        -- Map course name to course_id
        CASE
            WHEN LOWER(r.course_name) LIKE '%royal lakeside%' THEN 'royal_lakeside'
            WHEN LOWER(r.course_name) LIKE '%bangpakong%' THEN 'bangpakong'
            WHEN LOWER(r.course_name) LIKE '%pleasant valley%' THEN 'pleasant_valley'
            WHEN LOWER(r.course_name) LIKE '%pattaya country%' THEN 'pattaya_country_club'
            WHEN LOWER(r.course_name) LIKE '%greenwood%' THEN 'greenwood'
            WHEN LOWER(r.course_name) LIKE '%khao kheow%' THEN 'khao_kheow'
            WHEN LOWER(r.course_name) LIKE '%siam%' THEN 'siam_cc_old'
            ELSE NULL
        END
    ) AND ch.hole_number = rh.hole_number AND ch.tee_marker = 'white'
    WHERE rh.gross_score IS NOT NULL AND rh.gross_score > 0
)
SELECT
    display_name,
    course_name,
    hole_number,
    handicap_used,
    gross_score,
    stored_si,
    correct_si,
    stored_points,
    correct_points,
    (correct_points - stored_points) as points_diff
FROM score_check
WHERE stored_points != correct_points
ORDER BY display_name, round_id, hole_number;

-- =====================================================================
-- STEP 4: SUMMARY OF DISCREPANCIES BY PLAYER
-- =====================================================================
WITH score_check AS (
    SELECT
        rh.id as round_hole_id,
        r.id as round_id,
        r.golfer_id,
        up.display_name,
        r.course_name,
        r.handicap_used,
        rh.hole_number,
        rh.stableford_points as stored_points,
        calculate_stableford_points(
            rh.gross_score,
            COALESCE(ch.par, rh.par),
            r.handicap_used,
            COALESCE(ch.stroke_index, rh.stroke_index)
        ) as correct_points
    FROM round_holes rh
    JOIN rounds r ON r.id = rh.round_id
    LEFT JOIN user_profiles up ON up.line_user_id = r.golfer_id
    LEFT JOIN course_holes ch ON ch.course_id = (
        CASE
            WHEN LOWER(r.course_name) LIKE '%royal lakeside%' THEN 'royal_lakeside'
            WHEN LOWER(r.course_name) LIKE '%bangpakong%' THEN 'bangpakong'
            WHEN LOWER(r.course_name) LIKE '%pleasant valley%' THEN 'pleasant_valley'
            WHEN LOWER(r.course_name) LIKE '%pattaya country%' THEN 'pattaya_country_club'
            WHEN LOWER(r.course_name) LIKE '%greenwood%' THEN 'greenwood'
            WHEN LOWER(r.course_name) LIKE '%khao kheow%' THEN 'khao_kheow'
            WHEN LOWER(r.course_name) LIKE '%siam%' THEN 'siam_cc_old'
            ELSE NULL
        END
    ) AND ch.hole_number = rh.hole_number AND ch.tee_marker = 'white'
    WHERE rh.gross_score IS NOT NULL AND rh.gross_score > 0
)
SELECT
    display_name,
    COUNT(DISTINCT round_id) as rounds_affected,
    COUNT(*) as holes_with_errors,
    SUM(stored_points) as total_stored_points,
    SUM(correct_points) as total_correct_points,
    SUM(correct_points) - SUM(stored_points) as points_difference
FROM score_check
WHERE stored_points != correct_points
GROUP BY display_name, golfer_id
ORDER BY points_difference DESC;

-- =====================================================================
-- STEP 5: FIX ALL ROUND_HOLES STABLEFORD POINTS
-- =====================================================================
-- This updates all round_holes with correct stableford points
-- Uses a subquery to get correct course data, falling back to stored values

UPDATE round_holes rh
SET stableford_points = calculate_stableford_points(
    rh.gross_score,
    COALESCE(
        (SELECT ch.par FROM course_holes ch
         WHERE ch.course_id = (
            CASE
                WHEN LOWER(r.course_name) LIKE '%royal lakeside%' THEN 'royal_lakeside'
                WHEN LOWER(r.course_name) LIKE '%bangpakong%' THEN 'bangpakong'
                WHEN LOWER(r.course_name) LIKE '%pleasant valley%' THEN 'pleasant_valley'
                WHEN LOWER(r.course_name) LIKE '%pattaya country%' THEN 'pattaya_country_club'
                WHEN LOWER(r.course_name) LIKE '%greenwood%' THEN 'greenwood'
                WHEN LOWER(r.course_name) LIKE '%khao kheow%' THEN 'khao_kheow'
                WHEN LOWER(r.course_name) LIKE '%siam%' THEN 'siam_cc_old'
                ELSE NULL
            END
         )
         AND ch.hole_number = rh.hole_number
         AND ch.tee_marker = 'white'
         LIMIT 1),
        rh.par
    ),
    r.handicap_used,
    COALESCE(
        (SELECT ch.stroke_index FROM course_holes ch
         WHERE ch.course_id = (
            CASE
                WHEN LOWER(r.course_name) LIKE '%royal lakeside%' THEN 'royal_lakeside'
                WHEN LOWER(r.course_name) LIKE '%bangpakong%' THEN 'bangpakong'
                WHEN LOWER(r.course_name) LIKE '%pleasant valley%' THEN 'pleasant_valley'
                WHEN LOWER(r.course_name) LIKE '%pattaya country%' THEN 'pattaya_country_club'
                WHEN LOWER(r.course_name) LIKE '%greenwood%' THEN 'greenwood'
                WHEN LOWER(r.course_name) LIKE '%khao kheow%' THEN 'khao_kheow'
                WHEN LOWER(r.course_name) LIKE '%siam%' THEN 'siam_cc_old'
                ELSE NULL
            END
         )
         AND ch.hole_number = rh.hole_number
         AND ch.tee_marker = 'white'
         LIMIT 1),
        rh.stroke_index
    )
)
FROM rounds r
WHERE rh.round_id = r.id
AND rh.gross_score IS NOT NULL
AND rh.gross_score > 0;

-- =====================================================================
-- STEP 6: FIX ROUND TOTALS
-- =====================================================================
-- Update total_stableford in rounds table based on corrected hole points

UPDATE rounds r
SET total_stableford = (
    SELECT COALESCE(SUM(rh.stableford_points), 0)
    FROM round_holes rh
    WHERE rh.round_id = r.id
)
WHERE EXISTS (
    SELECT 1 FROM round_holes rh WHERE rh.round_id = r.id
);

-- =====================================================================
-- STEP 7: VERIFICATION - SHOW CORRECTED SCORES
-- =====================================================================
SELECT
    up.display_name,
    r.course_name,
    r.played_at::date,
    r.handicap_used,
    r.total_gross,
    r.total_stableford as corrected_total,
    (SELECT COUNT(*) FROM round_holes rh WHERE rh.round_id = r.id) as holes_counted
FROM rounds r
LEFT JOIN user_profiles up ON up.line_user_id = r.golfer_id
WHERE r.status = 'completed'
ORDER BY r.played_at DESC
LIMIT 20;

-- =====================================================================
-- CLEANUP: Drop the function if no longer needed
-- =====================================================================
-- DROP FUNCTION IF EXISTS calculate_stableford_points(INT, INT, NUMERIC, INT);
