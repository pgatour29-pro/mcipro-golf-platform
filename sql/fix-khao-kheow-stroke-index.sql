-- =====================================================================
-- Khao Kheow Country Club - CORRECT STROKE INDEX RATINGS
-- =====================================================================
-- Fixed based on actual scorecard handicap values
-- Date: 2025-11-03
-- =====================================================================

-- UPDATE ALL STROKE INDEX VALUES FOR KHAO KHEOW

-- =====================================================================
-- A+B COMBINATION (khao_kheow_ab)
-- =====================================================================

-- Front 9 (Course A) - All tee markers
UPDATE course_holes SET stroke_index = 12 WHERE course_id = 'khao_kheow_ab' AND hole_number = 1;
UPDATE course_holes SET stroke_index = 6 WHERE course_id = 'khao_kheow_ab' AND hole_number = 2;
UPDATE course_holes SET stroke_index = 14 WHERE course_id = 'khao_kheow_ab' AND hole_number = 3;
UPDATE course_holes SET stroke_index = 10 WHERE course_id = 'khao_kheow_ab' AND hole_number = 4;
UPDATE course_holes SET stroke_index = 18 WHERE course_id = 'khao_kheow_ab' AND hole_number = 5;
UPDATE course_holes SET stroke_index = 8 WHERE course_id = 'khao_kheow_ab' AND hole_number = 6;
UPDATE course_holes SET stroke_index = 4 WHERE course_id = 'khao_kheow_ab' AND hole_number = 7;
UPDATE course_holes SET stroke_index = 16 WHERE course_id = 'khao_kheow_ab' AND hole_number = 8;
UPDATE course_holes SET stroke_index = 2 WHERE course_id = 'khao_kheow_ab' AND hole_number = 9;

-- Back 9 (Course B) - All tee markers
UPDATE course_holes SET stroke_index = 11 WHERE course_id = 'khao_kheow_ab' AND hole_number = 10;
UPDATE course_holes SET stroke_index = 5 WHERE course_id = 'khao_kheow_ab' AND hole_number = 11;
UPDATE course_holes SET stroke_index = 13 WHERE course_id = 'khao_kheow_ab' AND hole_number = 12;
UPDATE course_holes SET stroke_index = 9 WHERE course_id = 'khao_kheow_ab' AND hole_number = 13;
UPDATE course_holes SET stroke_index = 17 WHERE course_id = 'khao_kheow_ab' AND hole_number = 14;
UPDATE course_holes SET stroke_index = 7 WHERE course_id = 'khao_kheow_ab' AND hole_number = 15;
UPDATE course_holes SET stroke_index = 3 WHERE course_id = 'khao_kheow_ab' AND hole_number = 16;
UPDATE course_holes SET stroke_index = 15 WHERE course_id = 'khao_kheow_ab' AND hole_number = 17;
UPDATE course_holes SET stroke_index = 1 WHERE course_id = 'khao_kheow_ab' AND hole_number = 18;

-- =====================================================================
-- B+C COMBINATION (khao_kheow_bc)
-- =====================================================================

-- Front 9 (Course B) - All tee markers
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
-- A+C COMBINATION (khao_kheow_ac)
-- =====================================================================

-- Front 9 (Course A) - All tee markers
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

-- Verify A+B
SELECT 'A+B VERIFICATION' as check_name;
SELECT course_id, hole_number, par, stroke_index, yardage, tee_marker
FROM course_holes
WHERE course_id = 'khao_kheow_ab' AND tee_marker = 'blue'
ORDER BY hole_number;

-- Verify B+C
SELECT 'B+C VERIFICATION' as check_name;
SELECT course_id, hole_number, par, stroke_index, yardage, tee_marker
FROM course_holes
WHERE course_id = 'khao_kheow_bc' AND tee_marker = 'blue'
ORDER BY hole_number;

-- Verify A+C
SELECT 'A+C VERIFICATION' as check_name;
SELECT course_id, hole_number, par, stroke_index, yardage, tee_marker
FROM course_holes
WHERE course_id = 'khao_kheow_ac' AND tee_marker = 'blue'
ORDER BY hole_number;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Khao Kheow stroke index ratings updated successfully!';
    RAISE NOTICE '✅ Updated all three combinations: A+B, B+C, A+C';
    RAISE NOTICE '✅ All tee markers (blue, yellow, white, red) updated';
    RAISE NOTICE '✅ Stroke index now reflects actual course difficulty';
END $$;
