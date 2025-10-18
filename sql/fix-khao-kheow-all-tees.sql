-- =====================================================================
-- Khao Kheow Country Club - Complete Tee Marker Data
-- =====================================================================
-- This is a 27-hole facility with three 9-hole courses (A, B, C)
-- Combined into three 18-hole configurations:
--   - khao_kheow_ab (A nine + B nine)
--   - khao_kheow_ac (A nine + C nine)
--   - khao_kheow_bc (B nine + C nine)
--
-- All tee markers: blue, yellow, white, red (lowercase)
-- =====================================================================

-- Clean up existing data
DELETE FROM course_holes WHERE course_id LIKE 'khao_kheow_%';

-- =====================================================================
-- COURSE COMBINATION 1: Khao Kheow A+B (khao_kheow_ab)
-- Course A (Holes 1-9) + Course B (Holes 10-18)
-- =====================================================================

-- Course A - Blue Tees (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_ab', 1, 4, 1, 354, 'blue'),
('khao_kheow_ab', 2, 5, 2, 592, 'blue'),
('khao_kheow_ab', 3, 3, 3, 194, 'blue'),
('khao_kheow_ab', 4, 4, 4, 462, 'blue'),
('khao_kheow_ab', 5, 3, 5, 175, 'blue'),
('khao_kheow_ab', 6, 4, 6, 433, 'blue'),
('khao_kheow_ab', 7, 4, 7, 364, 'blue'),
('khao_kheow_ab', 8, 5, 8, 489, 'blue'),
('khao_kheow_ab', 9, 4, 9, 430, 'blue');

-- Course B - Blue Tees (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_ab', 10, 4, 10, 430, 'blue'),
('khao_kheow_ab', 11, 5, 11, 553, 'blue'),
('khao_kheow_ab', 12, 3, 12, 199, 'blue'),
('khao_kheow_ab', 13, 4, 13, 426, 'blue'),
('khao_kheow_ab', 14, 4, 14, 375, 'blue'),
('khao_kheow_ab', 15, 5, 15, 560, 'blue'),
('khao_kheow_ab', 16, 4, 16, 465, 'blue'),
('khao_kheow_ab', 17, 3, 17, 146, 'blue'),
('khao_kheow_ab', 18, 4, 18, 430, 'blue');

-- Course A - Yellow Tees (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_ab', 1, 4, 1, 298, 'yellow'),
('khao_kheow_ab', 2, 5, 2, 533, 'yellow'),
('khao_kheow_ab', 3, 3, 3, 184, 'yellow'),
('khao_kheow_ab', 4, 4, 4, 417, 'yellow'),
('khao_kheow_ab', 5, 3, 5, 132, 'yellow'),
('khao_kheow_ab', 6, 4, 6, 384, 'yellow'),
('khao_kheow_ab', 7, 4, 7, 296, 'yellow'),
('khao_kheow_ab', 8, 5, 8, 459, 'yellow'),
('khao_kheow_ab', 9, 4, 9, 404, 'yellow');

-- Course B - Yellow Tees (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_ab', 10, 4, 10, 371, 'yellow'),
('khao_kheow_ab', 11, 5, 11, 526, 'yellow'),
('khao_kheow_ab', 12, 3, 12, 168, 'yellow'),
('khao_kheow_ab', 13, 4, 13, 382, 'yellow'),
('khao_kheow_ab', 14, 4, 14, 340, 'yellow'),
('khao_kheow_ab', 15, 5, 15, 510, 'yellow'),
('khao_kheow_ab', 16, 4, 16, 424, 'yellow'),
('khao_kheow_ab', 17, 3, 17, 128, 'yellow'),
('khao_kheow_ab', 18, 4, 18, 403, 'yellow');

-- Course A - White Tees (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_ab', 1, 4, 1, 269, 'white'),
('khao_kheow_ab', 2, 5, 2, 489, 'white'),
('khao_kheow_ab', 3, 3, 3, 164, 'white'),
('khao_kheow_ab', 4, 4, 4, 387, 'white'),
('khao_kheow_ab', 5, 3, 5, 122, 'white'),
('khao_kheow_ab', 6, 4, 6, 347, 'white'),
('khao_kheow_ab', 7, 4, 7, 262, 'white'),
('khao_kheow_ab', 8, 5, 8, 408, 'white'),
('khao_kheow_ab', 9, 4, 9, 373, 'white');

-- Course B - White Tees (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_ab', 10, 4, 10, 327, 'white'),
('khao_kheow_ab', 11, 5, 11, 490, 'white'),
('khao_kheow_ab', 12, 3, 12, 155, 'white'),
('khao_kheow_ab', 13, 4, 13, 336, 'white'),
('khao_kheow_ab', 14, 4, 14, 306, 'white'),
('khao_kheow_ab', 15, 5, 15, 458, 'white'),
('khao_kheow_ab', 16, 4, 16, 389, 'white'),
('khao_kheow_ab', 17, 3, 17, 124, 'white'),
('khao_kheow_ab', 18, 4, 18, 366, 'white');

-- Course A - Red Tees (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_ab', 1, 4, 1, 237, 'red'),
('khao_kheow_ab', 2, 5, 2, 443, 'red'),
('khao_kheow_ab', 3, 3, 3, 123, 'red'),
('khao_kheow_ab', 4, 4, 4, 329, 'red'),
('khao_kheow_ab', 5, 3, 5, 93, 'red'),
('khao_kheow_ab', 6, 4, 6, 309, 'red'),
('khao_kheow_ab', 7, 4, 7, 239, 'red'),
('khao_kheow_ab', 8, 5, 8, 347, 'red'),
('khao_kheow_ab', 9, 4, 9, 331, 'red');

-- Course B - Red Tees (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_ab', 10, 4, 10, 311, 'red'),
('khao_kheow_ab', 11, 5, 11, 449, 'red'),
('khao_kheow_ab', 12, 3, 12, 125, 'red'),
('khao_kheow_ab', 13, 4, 13, 285, 'red'),
('khao_kheow_ab', 14, 4, 14, 295, 'red'),
('khao_kheow_ab', 15, 5, 15, 413, 'red'),
('khao_kheow_ab', 16, 4, 16, 319, 'red'),
('khao_kheow_ab', 17, 3, 17, 104, 'red'),
('khao_kheow_ab', 18, 4, 18, 307, 'red');

-- =====================================================================
-- COURSE COMBINATION 2: Khao Kheow A+C (khao_kheow_ac)
-- Course A (Holes 1-9) + Course C (Holes 10-18)
-- =====================================================================

-- Course A - Blue Tees (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_ac', 1, 4, 1, 354, 'blue'),
('khao_kheow_ac', 2, 5, 2, 592, 'blue'),
('khao_kheow_ac', 3, 3, 3, 194, 'blue'),
('khao_kheow_ac', 4, 4, 4, 462, 'blue'),
('khao_kheow_ac', 5, 3, 5, 175, 'blue'),
('khao_kheow_ac', 6, 4, 6, 433, 'blue'),
('khao_kheow_ac', 7, 4, 7, 364, 'blue'),
('khao_kheow_ac', 8, 5, 8, 489, 'blue'),
('khao_kheow_ac', 9, 4, 9, 430, 'blue');

-- Course C - Blue Tees (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_ac', 10, 5, 10, 550, 'blue'),
('khao_kheow_ac', 11, 4, 11, 442, 'blue'),
('khao_kheow_ac', 12, 3, 12, 184, 'blue'),
('khao_kheow_ac', 13, 4, 13, 378, 'blue'),
('khao_kheow_ac', 14, 4, 14, 398, 'blue'),
('khao_kheow_ac', 15, 4, 15, 402, 'blue'),
('khao_kheow_ac', 16, 5, 16, 556, 'blue'),
('khao_kheow_ac', 17, 3, 17, 180, 'blue'),
('khao_kheow_ac', 18, 4, 18, 490, 'blue');

-- Course A - Yellow Tees (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_ac', 1, 4, 1, 298, 'yellow'),
('khao_kheow_ac', 2, 5, 2, 533, 'yellow'),
('khao_kheow_ac', 3, 3, 3, 184, 'yellow'),
('khao_kheow_ac', 4, 4, 4, 417, 'yellow'),
('khao_kheow_ac', 5, 3, 5, 132, 'yellow'),
('khao_kheow_ac', 6, 4, 6, 384, 'yellow'),
('khao_kheow_ac', 7, 4, 7, 296, 'yellow'),
('khao_kheow_ac', 8, 5, 8, 459, 'yellow'),
('khao_kheow_ac', 9, 4, 9, 404, 'yellow');

-- Course C - Yellow Tees (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_ac', 10, 5, 10, 525, 'yellow'),
('khao_kheow_ac', 11, 4, 11, 395, 'yellow'),
('khao_kheow_ac', 12, 3, 12, 167, 'yellow'),
('khao_kheow_ac', 13, 4, 13, 368, 'yellow'),
('khao_kheow_ac', 14, 4, 14, 384, 'yellow'),
('khao_kheow_ac', 15, 4, 15, 382, 'yellow'),
('khao_kheow_ac', 16, 5, 16, 511, 'yellow'),
('khao_kheow_ac', 17, 3, 17, 165, 'yellow'),
('khao_kheow_ac', 18, 4, 18, 337, 'yellow');

-- Course A - White Tees (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_ac', 1, 4, 1, 269, 'white'),
('khao_kheow_ac', 2, 5, 2, 489, 'white'),
('khao_kheow_ac', 3, 3, 3, 164, 'white'),
('khao_kheow_ac', 4, 4, 4, 387, 'white'),
('khao_kheow_ac', 5, 3, 5, 122, 'white'),
('khao_kheow_ac', 6, 4, 6, 347, 'white'),
('khao_kheow_ac', 7, 4, 7, 262, 'white'),
('khao_kheow_ac', 8, 5, 8, 408, 'white'),
('khao_kheow_ac', 9, 4, 9, 373, 'white');

-- Course C - White Tees (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_ac', 10, 5, 10, 418, 'white'),
('khao_kheow_ac', 11, 4, 11, 383, 'white'),
('khao_kheow_ac', 12, 3, 12, 138, 'white'),
('khao_kheow_ac', 13, 4, 13, 332, 'white'),
('khao_kheow_ac', 14, 4, 14, 363, 'white'),
('khao_kheow_ac', 15, 4, 15, 366, 'white'),
('khao_kheow_ac', 16, 5, 16, 493, 'white'),
('khao_kheow_ac', 17, 3, 17, 157, 'white'),
('khao_kheow_ac', 18, 4, 18, 318, 'white');

-- Course A - Red Tees (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_ac', 1, 4, 1, 237, 'red'),
('khao_kheow_ac', 2, 5, 2, 443, 'red'),
('khao_kheow_ac', 3, 3, 3, 123, 'red'),
('khao_kheow_ac', 4, 4, 4, 329, 'red'),
('khao_kheow_ac', 5, 3, 5, 93, 'red'),
('khao_kheow_ac', 6, 4, 6, 309, 'red'),
('khao_kheow_ac', 7, 4, 7, 239, 'red'),
('khao_kheow_ac', 8, 5, 8, 347, 'red'),
('khao_kheow_ac', 9, 4, 9, 331, 'red');

-- Course C - Red Tees (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_ac', 10, 5, 10, 406, 'red'),
('khao_kheow_ac', 11, 4, 11, 343, 'red'),
('khao_kheow_ac', 12, 3, 12, 107, 'red'),
('khao_kheow_ac', 13, 4, 13, 287, 'red'),
('khao_kheow_ac', 14, 4, 14, 306, 'red'),
('khao_kheow_ac', 15, 4, 15, 297, 'red'),
('khao_kheow_ac', 16, 5, 16, 447, 'red'),
('khao_kheow_ac', 17, 3, 17, 127, 'red'),
('khao_kheow_ac', 18, 4, 18, 268, 'red');

-- =====================================================================
-- COURSE COMBINATION 3: Khao Kheow B+C (khao_kheow_bc)
-- Course B (Holes 1-9) + Course C (Holes 10-18)
-- =====================================================================

-- Course B - Blue Tees (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_bc', 1, 4, 1, 430, 'blue'),
('khao_kheow_bc', 2, 5, 2, 553, 'blue'),
('khao_kheow_bc', 3, 3, 3, 199, 'blue'),
('khao_kheow_bc', 4, 4, 4, 426, 'blue'),
('khao_kheow_bc', 5, 4, 5, 375, 'blue'),
('khao_kheow_bc', 6, 5, 6, 560, 'blue'),
('khao_kheow_bc', 7, 4, 7, 465, 'blue'),
('khao_kheow_bc', 8, 3, 8, 146, 'blue'),
('khao_kheow_bc', 9, 4, 9, 430, 'blue');

-- Course C - Blue Tees (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_bc', 10, 5, 10, 550, 'blue'),
('khao_kheow_bc', 11, 4, 11, 442, 'blue'),
('khao_kheow_bc', 12, 3, 12, 184, 'blue'),
('khao_kheow_bc', 13, 4, 13, 378, 'blue'),
('khao_kheow_bc', 14, 4, 14, 398, 'blue'),
('khao_kheow_bc', 15, 4, 15, 402, 'blue'),
('khao_kheow_bc', 16, 5, 16, 556, 'blue'),
('khao_kheow_bc', 17, 3, 17, 180, 'blue'),
('khao_kheow_bc', 18, 4, 18, 490, 'blue');

-- Course B - Yellow Tees (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_bc', 1, 4, 1, 371, 'yellow'),
('khao_kheow_bc', 2, 5, 2, 526, 'yellow'),
('khao_kheow_bc', 3, 3, 3, 168, 'yellow'),
('khao_kheow_bc', 4, 4, 4, 382, 'yellow'),
('khao_kheow_bc', 5, 4, 5, 340, 'yellow'),
('khao_kheow_bc', 6, 5, 6, 510, 'yellow'),
('khao_kheow_bc', 7, 4, 7, 424, 'yellow'),
('khao_kheow_bc', 8, 3, 8, 128, 'yellow'),
('khao_kheow_bc', 9, 4, 9, 403, 'yellow');

-- Course C - Yellow Tees (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_bc', 10, 5, 10, 525, 'yellow'),
('khao_kheow_bc', 11, 4, 11, 395, 'yellow'),
('khao_kheow_bc', 12, 3, 12, 167, 'yellow'),
('khao_kheow_bc', 13, 4, 13, 368, 'yellow'),
('khao_kheow_bc', 14, 4, 14, 384, 'yellow'),
('khao_kheow_bc', 15, 4, 15, 382, 'yellow'),
('khao_kheow_bc', 16, 5, 16, 511, 'yellow'),
('khao_kheow_bc', 17, 3, 17, 165, 'yellow'),
('khao_kheow_bc', 18, 4, 18, 337, 'yellow');

-- Course B - White Tees (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_bc', 1, 4, 1, 327, 'white'),
('khao_kheow_bc', 2, 5, 2, 490, 'white'),
('khao_kheow_bc', 3, 3, 3, 155, 'white'),
('khao_kheow_bc', 4, 4, 4, 336, 'white'),
('khao_kheow_bc', 5, 4, 5, 306, 'white'),
('khao_kheow_bc', 6, 5, 6, 458, 'white'),
('khao_kheow_bc', 7, 4, 7, 389, 'white'),
('khao_kheow_bc', 8, 3, 8, 124, 'white'),
('khao_kheow_bc', 9, 4, 9, 366, 'white');

-- Course C - White Tees (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_bc', 10, 5, 10, 418, 'white'),
('khao_kheow_bc', 11, 4, 11, 383, 'white'),
('khao_kheow_bc', 12, 3, 12, 138, 'white'),
('khao_kheow_bc', 13, 4, 13, 332, 'white'),
('khao_kheow_bc', 14, 4, 14, 363, 'white'),
('khao_kheow_bc', 15, 4, 15, 366, 'white'),
('khao_kheow_bc', 16, 5, 16, 493, 'white'),
('khao_kheow_bc', 17, 3, 17, 157, 'white'),
('khao_kheow_bc', 18, 4, 18, 318, 'white');

-- Course B - Red Tees (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_bc', 1, 4, 1, 311, 'red'),
('khao_kheow_bc', 2, 5, 2, 449, 'red'),
('khao_kheow_bc', 3, 3, 3, 125, 'red'),
('khao_kheow_bc', 4, 4, 4, 285, 'red'),
('khao_kheow_bc', 5, 4, 5, 295, 'red'),
('khao_kheow_bc', 6, 5, 6, 413, 'red'),
('khao_kheow_bc', 7, 4, 7, 319, 'red'),
('khao_kheow_bc', 8, 3, 8, 104, 'red'),
('khao_kheow_bc', 9, 4, 9, 307, 'red');

-- Course C - Red Tees (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_bc', 10, 5, 10, 406, 'red'),
('khao_kheow_bc', 11, 4, 11, 343, 'red'),
('khao_kheow_bc', 12, 3, 12, 107, 'red'),
('khao_kheow_bc', 13, 4, 13, 287, 'red'),
('khao_kheow_bc', 14, 4, 14, 306, 'red'),
('khao_kheow_bc', 15, 4, 15, 297, 'red'),
('khao_kheow_bc', 16, 5, 16, 447, 'red'),
('khao_kheow_bc', 17, 3, 17, 127, 'red'),
('khao_kheow_bc', 18, 4, 18, 268, 'red');

-- =====================================================================
-- VERIFICATION QUERIES
-- =====================================================================

-- Verify hole counts for each course (should be 72 holes each: 18 holes x 4 tee markers)
SELECT
    course_id,
    COUNT(*) as total_holes,
    SUM(CASE WHEN tee_marker = 'blue' THEN 1 ELSE 0 END) as blue_tees,
    SUM(CASE WHEN tee_marker = 'yellow' THEN 1 ELSE 0 END) as yellow_tees,
    SUM(CASE WHEN tee_marker = 'white' THEN 1 ELSE 0 END) as white_tees,
    SUM(CASE WHEN tee_marker = 'red' THEN 1 ELSE 0 END) as red_tees
FROM course_holes
WHERE course_id LIKE 'khao_kheow_%'
GROUP BY course_id
ORDER BY course_id;

-- Verify total yardages for each course and tee marker
SELECT
    course_id,
    tee_marker,
    SUM(yardage) as total_yardage,
    COUNT(*) as hole_count
FROM course_holes
WHERE course_id LIKE 'khao_kheow_%'
GROUP BY course_id, tee_marker
ORDER BY course_id, tee_marker;

-- =====================================================================
-- SUCCESS MESSAGE
-- =====================================================================

SELECT '
=====================================================================
KHAO KHEOW COUNTRY CLUB - TEE MARKER UPDATE COMPLETE
=====================================================================

All tee markers have been successfully updated for all three 18-hole combinations:

KHAO KHEOW A+B (khao_kheow_ab):
  - Blue Tees:   7,077 yards (3,493 + 3,584)
  - Yellow Tees: 6,359 yards (3,107 + 3,252)
  - White Tees:  5,772 yards (2,821 + 2,951)
  - Red Tees:    5,059 yards (2,451 + 2,608)

KHAO KHEOW A+C (khao_kheow_ac):
  - Blue Tees:   7,073 yards (3,493 + 3,580)
  - Yellow Tees: 6,341 yards (3,107 + 3,234)
  - White Tees:  5,789 yards (2,821 + 2,968)
  - Red Tees:    5,039 yards (2,451 + 2,588)

KHAO KHEOW B+C (khao_kheow_bc):
  - Blue Tees:   7,164 yards (3,584 + 3,580)
  - Yellow Tees: 6,486 yards (3,252 + 3,234)
  - White Tees:  5,919 yards (2,951 + 2,968)
  - Red Tees:    5,196 yards (2,608 + 2,588)

Total: 216 hole records (72 per course combination)
All 4 tee markers (blue, yellow, white, red) for all 18 holes per combination
=====================================================================
' as status;
