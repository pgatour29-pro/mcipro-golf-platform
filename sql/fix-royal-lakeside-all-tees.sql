-- ================================================
-- Royal Lakeside Golf Club - Complete Tee Data Fix
-- ================================================
-- This script adds ALL tee markers from the scorecard
-- Course ID: royal_lakeside
-- Date: 2025-10-18
-- ================================================

-- Clean up existing data for this course
DELETE FROM course_holes WHERE course_id = 'royal_lakeside';

-- ================================================
-- BLACK TEES (Championship) - Total: 7,003 yards
-- ================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('royal_lakeside', 1, 5, 5, 522, 'black'),
('royal_lakeside', 2, 4, 11, 383, 'black'),
('royal_lakeside', 3, 3, 17, 185, 'black'),
('royal_lakeside', 4, 4, 9, 404, 'black'),
('royal_lakeside', 5, 4, 13, 424, 'black'),
('royal_lakeside', 6, 3, 15, 205, 'black'),
('royal_lakeside', 7, 5, 1, 543, 'black'),
('royal_lakeside', 8, 4, 7, 428, 'black'),
('royal_lakeside', 9, 4, 3, 413, 'black'),
('royal_lakeside', 10, 5, 6, 544, 'black'),
('royal_lakeside', 11, 4, 16, 367, 'black'),
('royal_lakeside', 12, 3, 14, 200, 'black'),
('royal_lakeside', 13, 4, 4, 453, 'black'),
('royal_lakeside', 14, 4, 8, 419, 'black'),
('royal_lakeside', 15, 3, 18, 177, 'black'),
('royal_lakeside', 16, 4, 10, 393, 'black'),
('royal_lakeside', 17, 4, 12, 380, 'black'),
('royal_lakeside', 18, 5, 2, 563, 'black');

-- ================================================
-- BLUE TEES (Men's) - Total: 6,653 yards
-- ================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('royal_lakeside', 1, 5, 5, 501, 'blue'),
('royal_lakeside', 2, 4, 11, 359, 'blue'),
('royal_lakeside', 3, 3, 17, 167, 'blue'),
('royal_lakeside', 4, 4, 9, 377, 'blue'),
('royal_lakeside', 5, 4, 13, 372, 'blue'),
('royal_lakeside', 6, 3, 15, 176, 'blue'),
('royal_lakeside', 7, 5, 1, 531, 'blue'),
('royal_lakeside', 8, 4, 7, 414, 'blue'),
('royal_lakeside', 9, 4, 3, 401, 'blue'),
('royal_lakeside', 10, 5, 6, 532, 'blue'),
('royal_lakeside', 11, 4, 16, 340, 'blue'),
('royal_lakeside', 12, 3, 14, 195, 'blue'),
('royal_lakeside', 13, 4, 4, 434, 'blue'),
('royal_lakeside', 14, 4, 8, 402, 'blue'),
('royal_lakeside', 15, 3, 18, 162, 'blue'),
('royal_lakeside', 16, 4, 10, 378, 'blue'),
('royal_lakeside', 17, 4, 12, 362, 'blue'),
('royal_lakeside', 18, 5, 2, 550, 'blue');

-- ================================================
-- WHITE TEES (Men's) - Total: 6,256 yards
-- ================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('royal_lakeside', 1, 5, 5, 490, 'white'),
('royal_lakeside', 2, 4, 11, 331, 'white'),
('royal_lakeside', 3, 3, 17, 144, 'white'),
('royal_lakeside', 4, 4, 9, 365, 'white'),
('royal_lakeside', 5, 4, 13, 353, 'white'),
('royal_lakeside', 6, 3, 15, 154, 'white'),
('royal_lakeside', 7, 5, 1, 508, 'white'),
('royal_lakeside', 8, 4, 7, 389, 'white'),
('royal_lakeside', 9, 4, 3, 376, 'white'),
('royal_lakeside', 10, 5, 6, 497, 'white'),
('royal_lakeside', 11, 4, 16, 311, 'white'),
('royal_lakeside', 12, 3, 14, 163, 'white'),
('royal_lakeside', 13, 4, 4, 420, 'white'),
('royal_lakeside', 14, 4, 8, 375, 'white'),
('royal_lakeside', 15, 3, 18, 152, 'white'),
('royal_lakeside', 16, 4, 10, 356, 'white'),
('royal_lakeside', 17, 4, 12, 350, 'white'),
('royal_lakeside', 18, 5, 2, 522, 'white');

-- ================================================
-- ORANGE TEES (Forward) - Total: 5,578 yards
-- ================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('royal_lakeside', 1, 5, 5, 420, 'orange'),
('royal_lakeside', 2, 4, 11, 308, 'orange'),
('royal_lakeside', 3, 3, 17, 136, 'orange'),
('royal_lakeside', 4, 4, 9, 318, 'orange'),
('royal_lakeside', 5, 4, 13, 316, 'orange'),
('royal_lakeside', 6, 3, 15, 131, 'orange'),
('royal_lakeside', 7, 5, 1, 477, 'orange'),
('royal_lakeside', 8, 4, 7, 368, 'orange'),
('royal_lakeside', 9, 4, 3, 327, 'orange'),
('royal_lakeside', 10, 5, 6, 460, 'orange'),
('royal_lakeside', 11, 4, 16, 277, 'orange'),
('royal_lakeside', 12, 3, 14, 128, 'orange'),
('royal_lakeside', 13, 4, 4, 352, 'orange'),
('royal_lakeside', 14, 4, 8, 324, 'orange'),
('royal_lakeside', 15, 3, 18, 134, 'orange'),
('royal_lakeside', 16, 4, 10, 325, 'orange'),
('royal_lakeside', 17, 4, 12, 291, 'orange'),
('royal_lakeside', 18, 5, 2, 486, 'orange');

-- ================================================
-- VERIFICATION QUERIES
-- ================================================

-- Check total records inserted (should be 72: 4 tees x 18 holes)
SELECT
    'Total Records' as check_type,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 72 THEN 'PASS' ELSE 'FAIL' END as status
FROM course_holes
WHERE course_id = 'royal_lakeside';

-- Verify yardage totals by tee
SELECT
    tee_marker,
    COUNT(*) as holes,
    SUM(par) as total_par,
    SUM(yardage) as total_yardage
FROM course_holes
WHERE course_id = 'royal_lakeside'
GROUP BY tee_marker
ORDER BY total_yardage DESC;

-- Expected Results:
-- black:  7,003 yards, Par 72
-- blue:   6,653 yards, Par 72
-- white:  6,256 yards, Par 72
-- orange: 5,578 yards, Par 72

-- ================================================
-- SUCCESS MESSAGE
-- ================================================
SELECT '
================================================
Royal Lakeside Golf Club - Data Import Complete
================================================
Black Tees:  7,003 yards (Championship)
Blue Tees:   6,653 yards (Men''s)
White Tees:  6,256 yards (Men''s)
Orange Tees: 5,578 yards (Forward)

All 4 tee markers imported successfully!
Total: 72 holes (4 tees x 18 holes)
Par: 72 for all tees
================================================
' as import_summary;
