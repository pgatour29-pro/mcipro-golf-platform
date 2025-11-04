-- =====================================================================
-- Khao Kheow - SIMPLE COURSE SELECTION SYSTEM
-- =====================================================================
-- Store each 9-hole course (A, B, C) separately with 9 holes each
-- Golfer selects: Front 9 (A/B/C) + Back 9 (A/B/C)
-- System dynamically combines them with correct stroke indices
-- =====================================================================

-- Clean up old data
DELETE FROM course_holes WHERE course_id LIKE 'khao_kheow_%';

-- =====================================================================
-- COURSE A (9 holes) - Stroke Index for A+C Combination
-- =====================================================================
-- When Course A is played, these are the stroke indices relative to other courses

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
-- COURSE B (9 holes) - Stroke Index for B+C Combination
-- =====================================================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Blue Tees
('khao_kheow_b', 1, 4, 11, 430, 'blue'),
('khao_kheow_b', 2, 5, 5, 553, 'blue'),
('khao_kheow_b', 3, 3, 13, 199, 'blue'),
('khao_kheow_b', 4, 4, 9, 426, 'blue'),
('khao_kheow_b', 5, 4, 17, 375, 'blue'),
('khao_kheow_b', 6, 5, 7, 560, 'blue'),
('khao_kheow_b', 7, 4, 3, 465, 'blue'),
('khao_kheow_b', 8, 3, 15, 146, 'blue'),
('khao_kheow_b', 9, 4, 1, 430, 'blue'),

-- Yellow Tees
('khao_kheow_b', 1, 4, 11, 371, 'yellow'),
('khao_kheow_b', 2, 5, 5, 526, 'yellow'),
('khao_kheow_b', 3, 3, 13, 168, 'yellow'),
('khao_kheow_b', 4, 4, 9, 382, 'yellow'),
('khao_kheow_b', 5, 4, 17, 340, 'yellow'),
('khao_kheow_b', 6, 5, 7, 510, 'yellow'),
('khao_kheow_b', 7, 4, 3, 424, 'yellow'),
('khao_kheow_b', 8, 3, 15, 128, 'yellow'),
('khao_kheow_b', 9, 4, 1, 403, 'yellow'),

-- White Tees
('khao_kheow_b', 1, 4, 11, 327, 'white'),
('khao_kheow_b', 2, 5, 5, 490, 'white'),
('khao_kheow_b', 3, 3, 13, 155, 'white'),
('khao_kheow_b', 4, 4, 9, 336, 'white'),
('khao_kheow_b', 5, 4, 17, 306, 'white'),
('khao_kheow_b', 6, 5, 7, 458, 'white'),
('khao_kheow_b', 7, 4, 3, 389, 'white'),
('khao_kheow_b', 8, 3, 15, 124, 'white'),
('khao_kheow_b', 9, 4, 1, 366, 'white'),

-- Red Tees
('khao_kheow_b', 1, 4, 11, 299, 'red'),
('khao_kheow_b', 2, 5, 5, 436, 'red'),
('khao_kheow_b', 3, 3, 13, 136, 'red'),
('khao_kheow_b', 4, 4, 9, 288, 'red'),
('khao_kheow_b', 5, 4, 17, 275, 'red'),
('khao_kheow_b', 6, 5, 7, 416, 'red'),
('khao_kheow_b', 7, 4, 3, 359, 'red'),
('khao_kheow_b', 8, 3, 15, 112, 'red'),
('khao_kheow_b', 9, 4, 1, 327, 'red');

-- =====================================================================
-- COURSE C (9 holes)
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
-- UPDATE COURSES TABLE - Add metadata for selection
-- =====================================================================

-- Update or insert course entries
INSERT INTO courses (id, name, location, description, has_multiple_courses)
VALUES
    ('khao_kheow_a', 'Khao Kheow - Course A (9 holes)', 'Chonburi, Thailand', 'Course A - 9 holes', true),
    ('khao_kheow_b', 'Khao Kheow - Course B (9 holes)', 'Chonburi, Thailand', 'Course B - 9 holes', true),
    ('khao_kheow_c', 'Khao Kheow - Course C (9 holes)', 'Chonburi, Thailand', 'Course C - 9 holes', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    has_multiple_courses = EXCLUDED.has_multiple_courses;

-- Verification
SELECT 'COURSE A' as course_name;
SELECT hole_number, par, stroke_index, yardage, tee_marker
FROM course_holes
WHERE course_id = 'khao_kheow_a' AND tee_marker = 'blue'
ORDER BY hole_number;

SELECT 'COURSE B' as course_name;
SELECT hole_number, par, stroke_index, yardage, tee_marker
FROM course_holes
WHERE course_id = 'khao_kheow_b' AND tee_marker = 'blue'
ORDER BY hole_number;

SELECT 'COURSE C' as course_name;
SELECT hole_number, par, stroke_index, yardage, tee_marker
FROM course_holes
WHERE course_id = 'khao_kheow_c' AND tee_marker = 'blue'
ORDER BY hole_number;

-- Success
DO $$
BEGIN
    RAISE NOTICE '✅ Khao Kheow courses restructured!';
    RAISE NOTICE '✅ Each course stored as 9 holes';
    RAISE NOTICE '✅ Golfer will select: Front 9 (A/B/C) + Back 9 (A/B/C)';
    RAISE NOTICE '✅ System will dynamically combine with correct stroke indices';
END $$;
