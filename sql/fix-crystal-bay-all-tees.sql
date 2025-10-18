-- =====================================================================
-- Crystal Bay Golf Club - Complete Tee Marker Data
-- =====================================================================
-- This file contains ALL tee markers for all 18 holes across Course A, B, and C
-- Tee Markers: Blue, White, Yellow, Red
-- =====================================================================

-- Delete existing data for Crystal Bay
DELETE FROM course_holes WHERE course_id = 'crystal_bay';

-- =====================================================================
-- COURSE A (Holes 1-9)
-- =====================================================================

-- BLUE Tees - Course A
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker, created_at, updated_at)
VALUES
('crystal_bay', 1, 4, 16, 389, 'blue', NOW(), NOW()),
('crystal_bay', 2, 4, 2, 435, 'blue', NOW(), NOW()),
('crystal_bay', 3, 4, 4, 430, 'blue', NOW(), NOW()),
('crystal_bay', 4, 5, 8, 472, 'blue', NOW(), NOW()),
('crystal_bay', 5, 4, 12, 373, 'blue', NOW(), NOW()),
('crystal_bay', 6, 3, 18, 162, 'blue', NOW(), NOW()),
('crystal_bay', 7, 4, 10, 420, 'blue', NOW(), NOW()),
('crystal_bay', 8, 5, 6, 497, 'blue', NOW(), NOW()),
('crystal_bay', 9, 3, 14, 138, 'blue', NOW(), NOW());

-- WHITE Tees - Course A
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker, created_at, updated_at)
VALUES
('crystal_bay', 1, 4, 16, 359, 'white', NOW(), NOW()),
('crystal_bay', 2, 4, 2, 408, 'white', NOW(), NOW()),
('crystal_bay', 3, 4, 4, 399, 'white', NOW(), NOW()),
('crystal_bay', 4, 5, 8, 452, 'white', NOW(), NOW()),
('crystal_bay', 5, 4, 12, 345, 'white', NOW(), NOW()),
('crystal_bay', 6, 3, 18, 147, 'white', NOW(), NOW()),
('crystal_bay', 7, 4, 10, 394, 'white', NOW(), NOW()),
('crystal_bay', 8, 5, 6, 467, 'white', NOW(), NOW()),
('crystal_bay', 9, 3, 14, 138, 'white', NOW(), NOW());

-- YELLOW Tees - Course A
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker, created_at, updated_at)
VALUES
('crystal_bay', 1, 4, 16, 341, 'yellow', NOW(), NOW()),
('crystal_bay', 2, 4, 2, 360, 'yellow', NOW(), NOW()),
('crystal_bay', 3, 4, 4, 370, 'yellow', NOW(), NOW()),
('crystal_bay', 4, 5, 8, 433, 'yellow', NOW(), NOW()),
('crystal_bay', 5, 4, 12, 318, 'yellow', NOW(), NOW()),
('crystal_bay', 6, 3, 18, 138, 'yellow', NOW(), NOW()),
('crystal_bay', 7, 4, 10, 364, 'yellow', NOW(), NOW()),
('crystal_bay', 8, 5, 6, 438, 'yellow', NOW(), NOW()),
('crystal_bay', 9, 3, 14, 135, 'yellow', NOW(), NOW());

-- RED Tees - Course A
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker, created_at, updated_at)
VALUES
('crystal_bay', 1, 4, 16, 310, 'red', NOW(), NOW()),
('crystal_bay', 2, 4, 2, 339, 'red', NOW(), NOW()),
('crystal_bay', 3, 4, 4, 340, 'red', NOW(), NOW()),
('crystal_bay', 4, 5, 8, 403, 'red', NOW(), NOW()),
('crystal_bay', 5, 4, 12, 152, 'red', NOW(), NOW()),
('crystal_bay', 6, 3, 18, 109, 'red', NOW(), NOW()),
('crystal_bay', 7, 4, 10, 328, 'red', NOW(), NOW()),
('crystal_bay', 8, 5, 6, 430, 'red', NOW(), NOW()),
('crystal_bay', 9, 3, 14, 74, 'red', NOW(), NOW());

-- =====================================================================
-- COURSE B (Holes 10-18)
-- =====================================================================

-- BLUE Tees - Course B
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker, created_at, updated_at)
VALUES
('crystal_bay', 10, 4, 13, 388, 'blue', NOW(), NOW()),
('crystal_bay', 11, 4, 11, 376, 'blue', NOW(), NOW()),
('crystal_bay', 12, 4, 7, 440, 'blue', NOW(), NOW()),
('crystal_bay', 13, 5, 9, 484, 'blue', NOW(), NOW()),
('crystal_bay', 14, 3, 17, 172, 'blue', NOW(), NOW()),
('crystal_bay', 15, 5, 3, 476, 'blue', NOW(), NOW()),
('crystal_bay', 16, 4, 5, 429, 'blue', NOW(), NOW()),
('crystal_bay', 17, 3, 15, 332, 'blue', NOW(), NOW()),
('crystal_bay', 18, 4, 1, 410, 'blue', NOW(), NOW());

-- WHITE Tees - Course B
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker, created_at, updated_at)
VALUES
('crystal_bay', 10, 4, 13, 388, 'white', NOW(), NOW()),
('crystal_bay', 11, 4, 11, 350, 'white', NOW(), NOW()),
('crystal_bay', 12, 4, 7, 413, 'white', NOW(), NOW()),
('crystal_bay', 13, 5, 9, 456, 'white', NOW(), NOW()),
('crystal_bay', 14, 3, 17, 147, 'white', NOW(), NOW()),
('crystal_bay', 15, 5, 3, 450, 'white', NOW(), NOW()),
('crystal_bay', 16, 4, 5, 402, 'white', NOW(), NOW()),
('crystal_bay', 17, 3, 15, 308, 'white', NOW(), NOW()),
('crystal_bay', 18, 4, 1, 385, 'white', NOW(), NOW());

-- YELLOW Tees - Course B
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker, created_at, updated_at)
VALUES
('crystal_bay', 10, 4, 13, 346, 'yellow', NOW(), NOW()),
('crystal_bay', 11, 4, 11, 336, 'yellow', NOW(), NOW()),
('crystal_bay', 12, 4, 7, 388, 'yellow', NOW(), NOW()),
('crystal_bay', 13, 5, 9, 440, 'yellow', NOW(), NOW()),
('crystal_bay', 14, 3, 17, 139, 'yellow', NOW(), NOW()),
('crystal_bay', 15, 5, 3, 412, 'yellow', NOW(), NOW()),
('crystal_bay', 16, 4, 5, 381, 'yellow', NOW(), NOW()),
('crystal_bay', 17, 3, 15, 300, 'yellow', NOW(), NOW()),
('crystal_bay', 18, 4, 1, 363, 'yellow', NOW(), NOW());

-- RED Tees - Course B
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker, created_at, updated_at)
VALUES
('crystal_bay', 10, 4, 13, 320, 'red', NOW(), NOW()),
('crystal_bay', 11, 4, 11, 308, 'red', NOW(), NOW()),
('crystal_bay', 12, 4, 7, 340, 'red', NOW(), NOW()),
('crystal_bay', 13, 5, 9, 416, 'red', NOW(), NOW()),
('crystal_bay', 14, 3, 17, 98, 'red', NOW(), NOW()),
('crystal_bay', 15, 5, 3, 381, 'red', NOW(), NOW()),
('crystal_bay', 16, 4, 5, 345, 'red', NOW(), NOW()),
('crystal_bay', 17, 3, 15, 152, 'red', NOW(), NOW()),
('crystal_bay', 18, 4, 1, 306, 'red', NOW(), NOW());

-- =====================================================================
-- COURSE C (Holes 19-27, mapped as 1-9 for 9-hole alternative)
-- =====================================================================

-- BLUE Tees - Course C
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker, created_at, updated_at)
VALUES
('crystal_bay', 19, 4, 18, 378, 'blue', NOW(), NOW()),
('crystal_bay', 20, 4, 6, 411, 'blue', NOW(), NOW()),
('crystal_bay', 21, 3, 14, 167, 'blue', NOW(), NOW()),
('crystal_bay', 22, 4, 8, 302, 'blue', NOW(), NOW()),
('crystal_bay', 23, 5, 10, 427, 'blue', NOW(), NOW()),
('crystal_bay', 24, 3, 16, 331, 'blue', NOW(), NOW()),
('crystal_bay', 25, 4, 2, 160, 'blue', NOW(), NOW()),
('crystal_bay', 26, 4, 12, 413, 'blue', NOW(), NOW()),
('crystal_bay', 27, 4, 4, 326, 'blue', NOW(), NOW());

-- WHITE Tees - Course C
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker, created_at, updated_at)
VALUES
('crystal_bay', 19, 4, 18, 359, 'white', NOW(), NOW()),
('crystal_bay', 20, 4, 6, 391, 'white', NOW(), NOW()),
('crystal_bay', 21, 3, 14, 156, 'white', NOW(), NOW()),
('crystal_bay', 22, 4, 8, 289, 'white', NOW(), NOW()),
('crystal_bay', 23, 5, 10, 401, 'white', NOW(), NOW()),
('crystal_bay', 24, 3, 16, 305, 'white', NOW(), NOW()),
('crystal_bay', 25, 4, 2, 150, 'white', NOW(), NOW()),
('crystal_bay', 26, 4, 12, 388, 'white', NOW(), NOW()),
('crystal_bay', 27, 4, 4, 361, 'white', NOW(), NOW());

-- YELLOW Tees - Course C
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker, created_at, updated_at)
VALUES
('crystal_bay', 19, 4, 18, 313, 'yellow', NOW(), NOW()),
('crystal_bay', 20, 4, 6, 365, 'yellow', NOW(), NOW()),
('crystal_bay', 21, 3, 14, 137, 'yellow', NOW(), NOW()),
('crystal_bay', 22, 4, 8, 164, 'yellow', NOW(), NOW()),
('crystal_bay', 23, 5, 10, 367, 'yellow', NOW(), NOW()),
('crystal_bay', 24, 3, 16, 278, 'yellow', NOW(), NOW()),
('crystal_bay', 25, 4, 2, 132, 'yellow', NOW(), NOW()),
('crystal_bay', 26, 4, 12, 368, 'yellow', NOW(), NOW()),
('crystal_bay', 27, 4, 4, 463, 'yellow', NOW(), NOW());

-- RED Tees - Course C
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker, created_at, updated_at)
VALUES
('crystal_bay', 19, 4, 18, 278, 'red', NOW(), NOW()),
('crystal_bay', 20, 4, 6, 311, 'red', NOW(), NOW()),
('crystal_bay', 21, 3, 14, 116, 'red', NOW(), NOW()),
('crystal_bay', 22, 4, 8, 145, 'red', NOW(), NOW()),
('crystal_bay', 23, 5, 10, 347, 'red', NOW(), NOW()),
('crystal_bay', 24, 3, 16, 247, 'red', NOW(), NOW()),
('crystal_bay', 25, 4, 2, 120, 'red', NOW(), NOW()),
('crystal_bay', 26, 4, 12, 340, 'red', NOW(), NOW()),
('crystal_bay', 27, 4, 4, 445, 'red', NOW(), NOW());

-- =====================================================================
-- VERIFICATION QUERIES
-- =====================================================================

-- Verify total yardages per tee color
SELECT
    tee_marker,
    COUNT(*) as hole_count,
    SUM(yardage) as total_yardage,
    SUM(par) as total_par
FROM course_holes
WHERE course_id = 'crystal_bay'
GROUP BY tee_marker
ORDER BY tee_marker;

-- Expected Totals (Course A + B):
-- Blue:   3316 + 3507 = 6823 yards, Par 72
-- White:  3109 + 3299 = 6408 yards, Par 72
-- Yellow: 2897 + 3105 = 6002 yards, Par 72
-- Red:    2485 + 2666 = 5151 yards, Par 72

-- Expected Totals (Course A + C):
-- Blue:   3316 + 2915 = 6231 yards, Par 70
-- White:  3109 + 2800 = 5909 yards, Par 70
-- Yellow: 2897 + 2587 = 5484 yards, Par 70
-- Red:    2485 + 2349 = 4834 yards, Par 70

-- Expected Totals (Course B + C):
-- Blue:   3507 + 2915 = 6422 yards, Par 70
-- White:  3299 + 2800 = 6099 yards, Par 70
-- Yellow: 3105 + 2587 = 5692 yards, Par 70
-- Red:    2666 + 2349 = 5015 yards, Par 70

-- Verify all holes are present
SELECT
    hole_number,
    COUNT(*) as tee_count
FROM course_holes
WHERE course_id = 'crystal_bay'
GROUP BY hole_number
ORDER BY hole_number;

-- =====================================================================
-- SUCCESS MESSAGE
-- =====================================================================
SELECT 'Crystal Bay Golf Club - All tee markers imported successfully!' as message;

-- =====================================================================
-- SUMMARY
-- =====================================================================
-- Total Records: 108 (27 holes x 4 tee colors)
-- Courses: A (holes 1-9), B (holes 10-18), C (holes 19-27)
-- Tee Colors: Blue (Championship), White (Men's), Yellow (Senior), Red (Ladies)
--
-- Course A Totals:
--   Blue:   3316 yards, Par 36
--   White:  3109 yards, Par 36
--   Yellow: 2897 yards, Par 36
--   Red:    2485 yards, Par 36
--
-- Course B Totals:
--   Blue:   3507 yards, Par 36
--   White:  3299 yards, Par 36
--   Yellow: 3105 yards, Par 36
--   Red:    2666 yards, Par 36
--
-- Course C Totals:
--   Blue:   2915 yards, Par 34
--   White:  2800 yards, Par 34
--   Yellow: 2587 yards, Par 34
--   Red:    2349 yards, Par 34
-- =====================================================================
