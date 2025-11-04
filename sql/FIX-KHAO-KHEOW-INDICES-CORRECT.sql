-- =====================================================================
-- FIX KHAO KHEOW STROKE INDICES - CORRECT VALUES
-- =====================================================================
-- Course A: 17, 7, 13, 1, 15, 9, 11, 3, 5
-- Course B (with A): 12, 6, 14, 10, 18, 8, 4, 16, 2
-- Course B (with C): 11, 5, 13, 9, 17, 7, 3, 15, 1
-- Course C: 4, 6, 16, 18, 12, 8, 2, 14, 10
-- =====================================================================

-- Course A - CONSTANT INDICES (9 holes)
UPDATE course_holes SET stroke_index = 17 WHERE course_id = 'khao_kheow_a' AND hole_number = 1;
UPDATE course_holes SET stroke_index = 7  WHERE course_id = 'khao_kheow_a' AND hole_number = 2;
UPDATE course_holes SET stroke_index = 13 WHERE course_id = 'khao_kheow_a' AND hole_number = 3;
UPDATE course_holes SET stroke_index = 1  WHERE course_id = 'khao_kheow_a' AND hole_number = 4;
UPDATE course_holes SET stroke_index = 15 WHERE course_id = 'khao_kheow_a' AND hole_number = 5;
UPDATE course_holes SET stroke_index = 9  WHERE course_id = 'khao_kheow_a' AND hole_number = 6;
UPDATE course_holes SET stroke_index = 11 WHERE course_id = 'khao_kheow_a' AND hole_number = 7;
UPDATE course_holes SET stroke_index = 3  WHERE course_id = 'khao_kheow_a' AND hole_number = 8;
UPDATE course_holes SET stroke_index = 5  WHERE course_id = 'khao_kheow_a' AND hole_number = 9;

-- Course B (with A) - when B is back 9 after A (9 holes)
UPDATE course_holes SET stroke_index = 12 WHERE course_id = 'khao_kheow_b_with_a' AND hole_number = 1;
UPDATE course_holes SET stroke_index = 6  WHERE course_id = 'khao_kheow_b_with_a' AND hole_number = 2;
UPDATE course_holes SET stroke_index = 14 WHERE course_id = 'khao_kheow_b_with_a' AND hole_number = 3;
UPDATE course_holes SET stroke_index = 10 WHERE course_id = 'khao_kheow_b_with_a' AND hole_number = 4;
UPDATE course_holes SET stroke_index = 18 WHERE course_id = 'khao_kheow_b_with_a' AND hole_number = 5;
UPDATE course_holes SET stroke_index = 8  WHERE course_id = 'khao_kheow_b_with_a' AND hole_number = 6;
UPDATE course_holes SET stroke_index = 4  WHERE course_id = 'khao_kheow_b_with_a' AND hole_number = 7;
UPDATE course_holes SET stroke_index = 16 WHERE course_id = 'khao_kheow_b_with_a' AND hole_number = 8;
UPDATE course_holes SET stroke_index = 2  WHERE course_id = 'khao_kheow_b_with_a' AND hole_number = 9;

-- Course B (with C) - when B is front 9 before C (9 holes)
UPDATE course_holes SET stroke_index = 11 WHERE course_id = 'khao_kheow_b_with_c' AND hole_number = 1;
UPDATE course_holes SET stroke_index = 5  WHERE course_id = 'khao_kheow_b_with_c' AND hole_number = 2;
UPDATE course_holes SET stroke_index = 13 WHERE course_id = 'khao_kheow_b_with_c' AND hole_number = 3;
UPDATE course_holes SET stroke_index = 9  WHERE course_id = 'khao_kheow_b_with_c' AND hole_number = 4;
UPDATE course_holes SET stroke_index = 17 WHERE course_id = 'khao_kheow_b_with_c' AND hole_number = 5;
UPDATE course_holes SET stroke_index = 7  WHERE course_id = 'khao_kheow_b_with_c' AND hole_number = 6;
UPDATE course_holes SET stroke_index = 3  WHERE course_id = 'khao_kheow_b_with_c' AND hole_number = 7;
UPDATE course_holes SET stroke_index = 15 WHERE course_id = 'khao_kheow_b_with_c' AND hole_number = 8;
UPDATE course_holes SET stroke_index = 1  WHERE course_id = 'khao_kheow_b_with_c' AND hole_number = 9;

-- Course C - CONSTANT INDICES (9 holes)
UPDATE course_holes SET stroke_index = 4  WHERE course_id = 'khao_kheow_c' AND hole_number = 1;
UPDATE course_holes SET stroke_index = 6  WHERE course_id = 'khao_kheow_c' AND hole_number = 2;
UPDATE course_holes SET stroke_index = 16 WHERE course_id = 'khao_kheow_c' AND hole_number = 3;
UPDATE course_holes SET stroke_index = 18 WHERE course_id = 'khao_kheow_c' AND hole_number = 4;
UPDATE course_holes SET stroke_index = 12 WHERE course_id = 'khao_kheow_c' AND hole_number = 5;
UPDATE course_holes SET stroke_index = 8  WHERE course_id = 'khao_kheow_c' AND hole_number = 6;
UPDATE course_holes SET stroke_index = 2  WHERE course_id = 'khao_kheow_c' AND hole_number = 7;
UPDATE course_holes SET stroke_index = 14 WHERE course_id = 'khao_kheow_c' AND hole_number = 8;
UPDATE course_holes SET stroke_index = 10 WHERE course_id = 'khao_kheow_c' AND hole_number = 9;

-- Verification
SELECT
    course_id,
    hole_number,
    stroke_index,
    CASE course_id
        WHEN 'khao_kheow_a' THEN
            CASE hole_number
                WHEN 1 THEN 17 WHEN 2 THEN 7 WHEN 3 THEN 13 WHEN 4 THEN 1 WHEN 5 THEN 15
                WHEN 6 THEN 9 WHEN 7 THEN 11 WHEN 8 THEN 3 WHEN 9 THEN 5
            END
        WHEN 'khao_kheow_b_with_a' THEN
            CASE hole_number
                WHEN 1 THEN 12 WHEN 2 THEN 6 WHEN 3 THEN 14 WHEN 4 THEN 10 WHEN 5 THEN 18
                WHEN 6 THEN 8 WHEN 7 THEN 4 WHEN 8 THEN 16 WHEN 9 THEN 2
            END
        WHEN 'khao_kheow_b_with_c' THEN
            CASE hole_number
                WHEN 1 THEN 11 WHEN 2 THEN 5 WHEN 3 THEN 13 WHEN 4 THEN 9 WHEN 5 THEN 17
                WHEN 6 THEN 7 WHEN 7 THEN 3 WHEN 8 THEN 15 WHEN 9 THEN 1
            END
        WHEN 'khao_kheow_c' THEN
            CASE hole_number
                WHEN 1 THEN 4 WHEN 2 THEN 6 WHEN 3 THEN 16 WHEN 4 THEN 18 WHEN 5 THEN 12
                WHEN 6 THEN 8 WHEN 7 THEN 2 WHEN 8 THEN 14 WHEN 9 THEN 10
            END
    END as expected_index,
    CASE WHEN stroke_index =
        CASE course_id
            WHEN 'khao_kheow_a' THEN
                CASE hole_number
                    WHEN 1 THEN 17 WHEN 2 THEN 7 WHEN 3 THEN 13 WHEN 4 THEN 1 WHEN 5 THEN 15
                    WHEN 6 THEN 9 WHEN 7 THEN 11 WHEN 8 THEN 3 WHEN 9 THEN 5
                END
            WHEN 'khao_kheow_b_with_a' THEN
                CASE hole_number
                    WHEN 1 THEN 12 WHEN 2 THEN 6 WHEN 3 THEN 14 WHEN 4 THEN 10 WHEN 5 THEN 18
                    WHEN 6 THEN 8 WHEN 7 THEN 4 WHEN 8 THEN 16 WHEN 9 THEN 2
                END
            WHEN 'khao_kheow_b_with_c' THEN
                CASE hole_number
                    WHEN 1 THEN 11 WHEN 2 THEN 5 WHEN 3 THEN 13 WHEN 4 THEN 9 WHEN 5 THEN 17
                    WHEN 6 THEN 7 WHEN 7 THEN 3 WHEN 8 THEN 15 WHEN 9 THEN 1
                END
            WHEN 'khao_kheow_c' THEN
                CASE hole_number
                    WHEN 1 THEN 4 WHEN 2 THEN 6 WHEN 3 THEN 16 WHEN 4 THEN 18 WHEN 5 THEN 12
                    WHEN 6 THEN 8 WHEN 7 THEN 2 WHEN 8 THEN 14 WHEN 9 THEN 10
                END
        END
    THEN '✅' ELSE '❌' END as status
FROM course_holes
WHERE course_id LIKE 'khao_kheow_%'
AND tee_marker = 'white'
ORDER BY course_id, hole_number;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ ALL KHAO KHEOW STROKE INDICES FIXED';
    RAISE NOTICE '✅ Course A: 17,7,13,1,15,9,11,3,5';
    RAISE NOTICE '✅ Course B (with A): 12,6,14,10,18,8,4,16,2';
    RAISE NOTICE '✅ Course B (with C): 11,5,13,9,17,7,3,15,1';
    RAISE NOTICE '✅ Course C: 4,6,16,18,12,8,2,14,10';
END $$;
