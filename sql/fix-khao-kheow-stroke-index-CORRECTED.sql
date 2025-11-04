-- =====================================================================
-- Khao Kheow Country Club - CORRECT STROKE INDEX RATINGS
-- =====================================================================
-- Fixed based on actual scorecard handicap values
-- Date: 2025-11-03
-- CORRECTED VERSION: Fixed course labels
-- =====================================================================

-- UPDATE ALL STROKE INDEX VALUES FOR KHAO KHEOW

-- =====================================================================
-- khao_kheow_ab = Course B (holes 1-9) + Course A (holes 10-18)
-- =====================================================================

-- Front 9 (Course B in B/A combination) - All tee markers
UPDATE course_holes SET stroke_index = 12 WHERE course_id = 'khao_kheow_ab' AND hole_number = 1;
UPDATE course_holes SET stroke_index = 6 WHERE course_id = 'khao_kheow_ab' AND hole_number = 2;
UPDATE course_holes SET stroke_index = 14 WHERE course_id = 'khao_kheow_ab' AND hole_number = 3;
UPDATE course_holes SET stroke_index = 10 WHERE course_id = 'khao_kheow_ab' AND hole_number = 4;
UPDATE course_holes SET stroke_index = 18 WHERE course_id = 'khao_kheow_ab' AND hole_number = 5;
UPDATE course_holes SET stroke_index = 8 WHERE course_id = 'khao_kheow_ab' AND hole_number = 6;
UPDATE course_holes SET stroke_index = 4 WHERE course_id = 'khao_kheow_ab' AND hole_number = 7;
UPDATE course_holes SET stroke_index = 16 WHERE course_id = 'khao_kheow_ab' AND hole_number = 8;
UPDATE course_holes SET stroke_index = 2 WHERE course_id = 'khao_kheow_ab' AND hole_number = 9;

-- Back 9 (Course A in B/A combination) - All tee markers
UPDATE course_holes SET stroke_index = 17 WHERE course_id = 'khao_kheow_ab' AND hole_number = 10;
UPDATE course_holes SET stroke_index = 7 WHERE course_id = 'khao_kheow_ab' AND hole_number = 11;
UPDATE course_holes SET stroke_index = 13 WHERE course_id = 'khao_kheow_ab' AND hole_number = 12;
UPDATE course_holes SET stroke_index = 1 WHERE course_id = 'khao_kheow_ab' AND hole_number = 13;
UPDATE course_holes SET stroke_index = 15 WHERE course_id = 'khao_kheow_ab' AND hole_number = 14;
UPDATE course_holes SET stroke_index = 9 WHERE course_id = 'khao_kheow_ab' AND hole_number = 15;
UPDATE course_holes SET stroke_index = 11 WHERE course_id = 'khao_kheow_ab' AND hole_number = 16;
UPDATE course_holes SET stroke_index = 3 WHERE course_id = 'khao_kheow_ab' AND hole_number = 17;
UPDATE course_holes SET stroke_index = 5 WHERE course_id = 'khao_kheow_ab' AND hole_number = 18;

-- =====================================================================
-- khao_kheow_bc = Course B (holes 1-9) + Course C (holes 10-18)
-- =====================================================================

-- Front 9 (Course B in B/C combination) - All tee markers
UPDATE course_holes SET stroke_index = 11 WHERE course_id = 'khao_kheow_bc' AND hole_number = 1;
UPDATE course_holes SET stroke_index = 5 WHERE course_id = 'khao_kheow_bc' AND hole_number = 2;
UPDATE course_holes SET stroke_index = 13 WHERE course_id = 'khao_kheow_bc' AND hole_number = 3;
UPDATE course_holes SET stroke_index = 9 WHERE course_id = 'khao_kheow_bc' AND hole_number = 4;
UPDATE course_holes SET stroke_index = 17 WHERE course_id = 'khao_kheow_bc' AND hole_number = 5;
UPDATE course_holes SET stroke_index = 7 WHERE course_id = 'khao_kheow_bc' AND hole_number = 6;
UPDATE course_holes SET stroke_index = 3 WHERE course_id = 'khao_kheow_bc' AND hole_number = 7;
UPDATE course_holes SET stroke_index = 15 WHERE course_id = 'khao_kheow_bc' AND hole_number = 8;
UPDATE course_holes SET stroke_index = 1 WHERE course_id = 'khao_kheow_bc' AND hole_number = 9;

-- Back 9 (Course C) - All tee markers
UPDATE course_holes SET stroke_index = 4 WHERE course_id = 'khao_kheow_bc' AND hole_number = 10;
UPDATE course_holes SET stroke_index = 6 WHERE course_id = 'khao_kheow_bc' AND hole_number = 11;
UPDATE course_holes SET stroke_index = 16 WHERE course_id = 'khao_kheow_bc' AND hole_number = 12;
UPDATE course_holes SET stroke_index = 18 WHERE course_id = 'khao_kheow_bc' AND hole_number = 13;
UPDATE course_holes SET stroke_index = 12 WHERE course_id = 'khao_kheow_bc' AND hole_number = 14;
UPDATE course_holes SET stroke_index = 8 WHERE course_id = 'khao_kheow_bc' AND hole_number = 15;
UPDATE course_holes SET stroke_index = 2 WHERE course_id = 'khao_kheow_bc' AND hole_number = 16;
UPDATE course_holes SET stroke_index = 14 WHERE course_id = 'khao_kheow_bc' AND hole_number = 17;
UPDATE course_holes SET stroke_index = 10 WHERE course_id = 'khao_kheow_bc' AND hole_number = 18;

-- =====================================================================
-- khao_kheow_ac = Course A (holes 1-9) + Course C (holes 10-18)
-- =====================================================================

-- Front 9 (Course A in A/C combination) - All tee markers
UPDATE course_holes SET stroke_index = 17 WHERE course_id = 'khao_kheow_ac' AND hole_number = 1;
UPDATE course_holes SET stroke_index = 7 WHERE course_id = 'khao_kheow_ac' AND hole_number = 2;
UPDATE course_holes SET stroke_index = 13 WHERE course_id = 'khao_kheow_ac' AND hole_number = 3;
UPDATE course_holes SET stroke_index = 1 WHERE course_id = 'khao_kheow_ac' AND hole_number = 4;
UPDATE course_holes SET stroke_index = 15 WHERE course_id = 'khao_kheow_ac' AND hole_number = 5;
UPDATE course_holes SET stroke_index = 9 WHERE course_id = 'khao_kheow_ac' AND hole_number = 6;
UPDATE course_holes SET stroke_index = 11 WHERE course_id = 'khao_kheow_ac' AND hole_number = 7;
UPDATE course_holes SET stroke_index = 3 WHERE course_id = 'khao_kheow_ac' AND hole_number = 8;
UPDATE course_holes SET stroke_index = 5 WHERE course_id = 'khao_kheow_ac' AND hole_number = 9;

-- Back 9 (Course C) - All tee markers
UPDATE course_holes SET stroke_index = 4 WHERE course_id = 'khao_kheow_ac' AND hole_number = 10;
UPDATE course_holes SET stroke_index = 6 WHERE course_id = 'khao_kheow_ac' AND hole_number = 11;
UPDATE course_holes SET stroke_index = 16 WHERE course_id = 'khao_kheow_ac' AND hole_number = 12;
UPDATE course_holes SET stroke_index = 18 WHERE course_id = 'khao_kheow_ac' AND hole_number = 13;
UPDATE course_holes SET stroke_index = 12 WHERE course_id = 'khao_kheow_ac' AND hole_number = 14;
UPDATE course_holes SET stroke_index = 8 WHERE course_id = 'khao_kheow_ac' AND hole_number = 15;
UPDATE course_holes SET stroke_index = 2 WHERE course_id = 'khao_kheow_ac' AND hole_number = 16;
UPDATE course_holes SET stroke_index = 14 WHERE course_id = 'khao_kheow_ac' AND hole_number = 17;
UPDATE course_holes SET stroke_index = 10 WHERE course_id = 'khao_kheow_ac' AND hole_number = 18;

-- =====================================================================
-- VERIFICATION QUERIES
-- =====================================================================

-- Verify B/A (khao_kheow_ab)
SELECT 'B/A COMBINATION (khao_kheow_ab)' as check_name;
SELECT
    CASE
        WHEN hole_number <= 9 THEN CONCAT('B', hole_number)
        ELSE CONCAT('A', hole_number - 9)
    END as actual_hole,
    hole_number as db_hole,
    par,
    stroke_index,
    yardage,
    tee_marker
FROM course_holes
WHERE course_id = 'khao_kheow_ab' AND tee_marker = 'blue'
ORDER BY hole_number;

-- Verify B/C (khao_kheow_bc)
SELECT 'B/C COMBINATION (khao_kheow_bc)' as check_name;
SELECT
    CASE
        WHEN hole_number <= 9 THEN CONCAT('B', hole_number)
        ELSE CONCAT('C', hole_number - 9)
    END as actual_hole,
    hole_number as db_hole,
    par,
    stroke_index,
    yardage,
    tee_marker
FROM course_holes
WHERE course_id = 'khao_kheow_bc' AND tee_marker = 'blue'
ORDER BY hole_number;

-- Verify A/C (khao_kheow_ac)
SELECT 'A/C COMBINATION (khao_kheow_ac)' as check_name;
SELECT
    CASE
        WHEN hole_number <= 9 THEN CONCAT('A', hole_number)
        ELSE CONCAT('C', hole_number - 9)
    END as actual_hole,
    hole_number as db_hole,
    par,
    stroke_index,
    yardage,
    tee_marker
FROM course_holes
WHERE course_id = 'khao_kheow_ac' AND tee_marker = 'blue'
ORDER BY hole_number;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Khao Kheow stroke index ratings updated successfully!';
    RAISE NOTICE '✅ Database combinations mapped correctly:';
    RAISE NOTICE '   - khao_kheow_ab = Course B (1-9) + Course A (10-18)';
    RAISE NOTICE '   - khao_kheow_bc = Course B (1-9) + Course C (10-18)';
    RAISE NOTICE '   - khao_kheow_ac = Course A (1-9) + Course C (10-18)';
    RAISE NOTICE '✅ All tee markers (blue, yellow, white, red) updated';
    RAISE NOTICE '✅ Stroke index now reflects actual course difficulty';
END $$;
