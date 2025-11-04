-- =====================================================================
-- Khao Kheow - SIMPLE COURSE SELECTION SYSTEM
-- =====================================================================
-- Store 3 courses: A (fixed), B_with_A, B_with_C, C (fixed)
-- Golfer selects: Front 9 [A/B/C] + Back 9 [A/B/C]
-- System loads correct stroke indices automatically
-- =====================================================================

-- Clean up old combinations
DELETE FROM course_holes WHERE course_id LIKE 'khao_kheow_%';

-- =====================================================================
-- COURSE A (9 holes) - CONSTANT INDICES
-- Indices: 17, 7, 13, 1, 15, 9, 11, 3, 5
-- =====================================================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Blue Tees
('khao_kheow_a', 1, 4, 17, 354, 'blue'),
('khao_kheow_a', 2, 5, 7, 592, 'blue'),
('khao_kheow_a', 3, 3, 13, 194, 'blue'),
('khao_kheow_a', 4, 4, 1, 462, 'blue'),
('khao_kheow_a', 5, 3, 15, 175, 'blue'),
('khao_kheow_a', 6, 4, 9, 433, 'blue'),
('khao_kheow_a', 7, 4, 11, 364, 'blue'),
('khao_kheow_a', 8, 5, 3, 489, 'blue'),
('khao_kheow_a', 9, 4, 5, 430, 'blue'),

-- Yellow Tees
('khao_kheow_a', 1, 4, 17, 298, 'yellow'),
('khao_kheow_a', 2, 5, 7, 533, 'yellow'),
('khao_kheow_a', 3, 3, 13, 184, 'yellow'),
('khao_kheow_a', 4, 4, 1, 417, 'yellow'),
('khao_kheow_a', 5, 3, 15, 132, 'yellow'),
('khao_kheow_a', 6, 4, 9, 384, 'yellow'),
('khao_kheow_a', 7, 4, 11, 296, 'yellow'),
('khao_kheow_a', 8, 5, 3, 459, 'yellow'),
('khao_kheow_a', 9, 4, 5, 404, 'yellow'),

-- White Tees
('khao_kheow_a', 1, 4, 17, 269, 'white'),
('khao_kheow_a', 2, 5, 7, 489, 'white'),
('khao_kheow_a', 3, 3, 13, 164, 'white'),
('khao_kheow_a', 4, 4, 1, 387, 'white'),
('khao_kheow_a', 5, 3, 15, 122, 'white'),
('khao_kheow_a', 6, 4, 9, 347, 'white'),
('khao_kheow_a', 7, 4, 11, 262, 'white'),
('khao_kheow_a', 8, 5, 3, 408, 'white'),
('khao_kheow_a', 9, 4, 5, 373, 'white'),

-- Red Tees
('khao_kheow_a', 1, 4, 17, 237, 'red'),
('khao_kheow_a', 2, 5, 7, 443, 'red'),
('khao_kheow_a', 3, 3, 13, 123, 'red'),
('khao_kheow_a', 4, 4, 1, 329, 'red'),
('khao_kheow_a', 5, 3, 15, 93, 'red'),
('khao_kheow_a', 6, 4, 9, 309, 'red'),
('khao_kheow_a', 7, 4, 11, 224, 'red'),
('khao_kheow_a', 8, 5, 3, 359, 'red'),
('khao_kheow_a', 9, 4, 5, 328, 'red');

-- =====================================================================
-- COURSE B WITH A (9 holes) - Use when B paired with A
-- Indices: 12, 6, 14, 10, 18, 8, 4, 16, 2
-- =====================================================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Blue Tees
('khao_kheow_b_with_a', 1, 4, 12, 430, 'blue'),
('khao_kheow_b_with_a', 2, 5, 6, 553, 'blue'),
('khao_kheow_b_with_a', 3, 3, 14, 199, 'blue'),
('khao_kheow_b_with_a', 4, 4, 10, 426, 'blue'),
('khao_kheow_b_with_a', 5, 4, 18, 375, 'blue'),
('khao_kheow_b_with_a', 6, 5, 8, 560, 'blue'),
('khao_kheow_b_with_a', 7, 4, 4, 465, 'blue'),
('khao_kheow_b_with_a', 8, 3, 16, 146, 'blue'),
('khao_kheow_b_with_a', 9, 4, 2, 430, 'blue'),

-- Yellow Tees
('khao_kheow_b_with_a', 1, 4, 12, 371, 'yellow'),
('khao_kheow_b_with_a', 2, 5, 6, 526, 'yellow'),
('khao_kheow_b_with_a', 3, 3, 14, 168, 'yellow'),
('khao_kheow_b_with_a', 4, 4, 10, 382, 'yellow'),
('khao_kheow_b_with_a', 5, 4, 18, 340, 'yellow'),
('khao_kheow_b_with_a', 6, 5, 8, 510, 'yellow'),
('khao_kheow_b_with_a', 7, 4, 4, 424, 'yellow'),
('khao_kheow_b_with_a', 8, 3, 16, 128, 'yellow'),
('khao_kheow_b_with_a', 9, 4, 2, 403, 'yellow'),

-- White Tees
('khao_kheow_b_with_a', 1, 4, 12, 327, 'white'),
('khao_kheow_b_with_a', 2, 5, 6, 490, 'white'),
('khao_kheow_b_with_a', 3, 3, 14, 155, 'white'),
('khao_kheow_b_with_a', 4, 4, 10, 336, 'white'),
('khao_kheow_b_with_a', 5, 4, 18, 306, 'white'),
('khao_kheow_b_with_a', 6, 5, 8, 458, 'white'),
('khao_kheow_b_with_a', 7, 4, 4, 389, 'white'),
('khao_kheow_b_with_a', 8, 3, 16, 124, 'white'),
('khao_kheow_b_with_a', 9, 4, 2, 366, 'white'),

-- Red Tees
('khao_kheow_b_with_a', 1, 4, 12, 299, 'red'),
('khao_kheow_b_with_a', 2, 5, 6, 436, 'red'),
('khao_kheow_b_with_a', 3, 3, 14, 136, 'red'),
('khao_kheow_b_with_a', 4, 4, 10, 288, 'red'),
('khao_kheow_b_with_a', 5, 4, 18, 275, 'red'),
('khao_kheow_b_with_a', 6, 5, 8, 416, 'red'),
('khao_kheow_b_with_a', 7, 4, 4, 359, 'red'),
('khao_kheow_b_with_a', 8, 3, 16, 112, 'red'),
('khao_kheow_b_with_a', 9, 4, 2, 327, 'red');

-- =====================================================================
-- COURSE B WITH C (9 holes) - Use when B paired with C
-- Indices: 11, 5, 13, 9, 17, 7, 3, 15, 1
-- =====================================================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Blue Tees
('khao_kheow_b_with_c', 1, 4, 11, 430, 'blue'),
('khao_kheow_b_with_c', 2, 5, 5, 553, 'blue'),
('khao_kheow_b_with_c', 3, 3, 13, 199, 'blue'),
('khao_kheow_b_with_c', 4, 4, 9, 426, 'blue'),
('khao_kheow_b_with_c', 5, 4, 17, 375, 'blue'),
('khao_kheow_b_with_c', 6, 5, 7, 560, 'blue'),
('khao_kheow_b_with_c', 7, 4, 3, 465, 'blue'),
('khao_kheow_b_with_c', 8, 3, 15, 146, 'blue'),
('khao_kheow_b_with_c', 9, 4, 1, 430, 'blue'),

-- Yellow Tees
('khao_kheow_b_with_c', 1, 4, 11, 371, 'yellow'),
('khao_kheow_b_with_c', 2, 5, 5, 526, 'yellow'),
('khao_kheow_b_with_c', 3, 3, 13, 168, 'yellow'),
('khao_kheow_b_with_c', 4, 4, 9, 382, 'yellow'),
('khao_kheow_b_with_c', 5, 4, 17, 340, 'yellow'),
('khao_kheow_b_with_c', 6, 5, 7, 510, 'yellow'),
('khao_kheow_b_with_c', 7, 4, 3, 424, 'yellow'),
('khao_kheow_b_with_c', 8, 3, 15, 128, 'yellow'),
('khao_kheow_b_with_c', 9, 4, 1, 403, 'yellow'),

-- White Tees
('khao_kheow_b_with_c', 1, 4, 11, 327, 'white'),
('khao_kheow_b_with_c', 2, 5, 5, 490, 'white'),
('khao_kheow_b_with_c', 3, 3, 13, 155, 'white'),
('khao_kheow_b_with_c', 4, 4, 9, 336, 'white'),
('khao_kheow_b_with_c', 5, 4, 17, 306, 'white'),
('khao_kheow_b_with_c', 6, 5, 7, 458, 'white'),
('khao_kheow_b_with_c', 7, 4, 3, 389, 'white'),
('khao_kheow_b_with_c', 8, 3, 15, 124, 'white'),
('khao_kheow_b_with_c', 9, 4, 1, 366, 'white'),

-- Red Tees
('khao_kheow_b_with_c', 1, 4, 11, 299, 'red'),
('khao_kheow_b_with_c', 2, 5, 5, 436, 'red'),
('khao_kheow_b_with_c', 3, 3, 13, 136, 'red'),
('khao_kheow_b_with_c', 4, 4, 9, 288, 'red'),
('khao_kheow_b_with_c', 5, 4, 17, 275, 'red'),
('khao_kheow_b_with_c', 6, 5, 7, 416, 'red'),
('khao_kheow_b_with_c', 7, 4, 3, 359, 'red'),
('khao_kheow_b_with_c', 8, 3, 15, 112, 'red'),
('khao_kheow_b_with_c', 9, 4, 1, 327, 'red');

-- =====================================================================
-- COURSE C (9 holes) - CONSTANT INDICES
-- Indices: 4, 6, 16, 18, 12, 8, 2, 14, 10
-- =====================================================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Blue Tees
('khao_kheow_c', 1, 5, 4, 550, 'blue'),
('khao_kheow_c', 2, 4, 6, 442, 'blue'),
('khao_kheow_c', 3, 3, 16, 184, 'blue'),
('khao_kheow_c', 4, 4, 18, 394, 'blue'),
('khao_kheow_c', 5, 4, 12, 430, 'blue'),
('khao_kheow_c', 6, 5, 8, 530, 'blue'),
('khao_kheow_c', 7, 4, 2, 466, 'blue'),
('khao_kheow_c', 8, 3, 14, 177, 'blue'),
('khao_kheow_c', 9, 4, 10, 385, 'blue'),

-- Yellow Tees
('khao_kheow_c', 1, 5, 4, 484, 'yellow'),
('khao_kheow_c', 2, 4, 6, 388, 'yellow'),
('khao_kheow_c', 3, 3, 16, 155, 'yellow'),
('khao_kheow_c', 4, 4, 18, 350, 'yellow'),
('khao_kheow_c', 5, 4, 12, 394, 'yellow'),
('khao_kheow_c', 6, 5, 8, 474, 'yellow'),
('khao_kheow_c', 7, 4, 2, 418, 'yellow'),
('khao_kheow_c', 8, 3, 14, 161, 'yellow'),
('khao_kheow_c', 9, 4, 10, 339, 'yellow'),

-- White Tees
('khao_kheow_c', 1, 5, 4, 432, 'white'),
('khao_kheow_c', 2, 4, 6, 349, 'white'),
('khao_kheow_c', 3, 3, 16, 144, 'white'),
('khao_kheow_c', 4, 4, 18, 313, 'white'),
('khao_kheow_c', 5, 4, 12, 351, 'white'),
('khao_kheow_c', 6, 5, 8, 426, 'white'),
('khao_kheow_c', 7, 4, 2, 377, 'white'),
('khao_kheow_c', 8, 3, 14, 144, 'white'),
('khao_kheow_c', 9, 4, 10, 304, 'white'),

-- Red Tees
('khao_kheow_c', 1, 5, 4, 378, 'red'),
('khao_kheow_c', 2, 4, 6, 300, 'red'),
('khao_kheow_c', 3, 3, 16, 120, 'red'),
('khao_kheow_c', 4, 4, 18, 269, 'red'),
('khao_kheow_c', 5, 4, 12, 315, 'red'),
('khao_kheow_c', 6, 5, 8, 368, 'red'),
('khao_kheow_c', 7, 4, 2, 334, 'red'),
('khao_kheow_c', 8, 3, 14, 129, 'red'),
('khao_kheow_c', 9, 4, 10, 269, 'red');

-- =====================================================================
-- VERIFICATION
-- =====================================================================

SELECT 'COURSE A (constant)' as course;
SELECT hole_number, par, stroke_index, yardage
FROM course_holes
WHERE course_id = 'khao_kheow_a' AND tee_marker = 'blue'
ORDER BY hole_number;

SELECT 'COURSE B with A' as course;
SELECT hole_number, par, stroke_index, yardage
FROM course_holes
WHERE course_id = 'khao_kheow_b_with_a' AND tee_marker = 'blue'
ORDER BY hole_number;

SELECT 'COURSE B with C' as course;
SELECT hole_number, par, stroke_index, yardage
FROM course_holes
WHERE course_id = 'khao_kheow_b_with_c' AND tee_marker = 'blue'
ORDER BY hole_number;

SELECT 'COURSE C (constant)' as course;
SELECT hole_number, par, stroke_index, yardage
FROM course_holes
WHERE course_id = 'khao_kheow_c' AND tee_marker = 'blue'
ORDER BY hole_number;

-- Success
DO $$
BEGIN
    RAISE NOTICE '✅ Khao Kheow simple selection system ready!';
    RAISE NOTICE '✅ Course A: Fixed indices (17,7,13,1,15,9,11,3,5)';
    RAISE NOTICE '✅ Course B with A: Indices (12,6,14,10,18,8,4,16,2)';
    RAISE NOTICE '✅ Course B with C: Indices (11,5,13,9,17,7,3,15,1)';
    RAISE NOTICE '✅ Course C: Fixed indices (4,6,16,18,12,8,2,14,10)';
    RAISE NOTICE '';
    RAISE NOTICE 'Next: Update UI for course selection dropdown';
END $$;
