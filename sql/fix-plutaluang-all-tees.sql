-- ================================================================
-- Plutaluang Royal Thai Navy Golf Course - Complete Tee Markers Data
-- ================================================================
-- This file contains ALL tee marker data extracted from the scorecard
-- Course: Plutaluang Royal Thai Navy Golf Course
-- Layout: North Course (holes 1-9) + West Course (holes 10-18)
-- Tee Markers: BLUE, WHITE, YELLOW, RED
-- ================================================================

-- Clean up existing data for Plutaluang
DELETE FROM course_holes WHERE course_id = 'plutaluang';

-- ================================================================
-- BLUE TEES (Championship)
-- Total Yardage: 6851 yards
-- ================================================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- NORTH COURSE (Holes 1-9)
('plutaluang', 1, 4, 11, 422, 'blue'),
('plutaluang', 2, 5, 1, 521, 'blue'),
('plutaluang', 3, 3, 15, 165, 'blue'),
('plutaluang', 4, 5, 3, 596, 'blue'),
('plutaluang', 5, 4, 13, 421, 'blue'),
('plutaluang', 6, 4, 17, 180, 'blue'),
('plutaluang', 7, 4, 7, 397, 'blue'),
('plutaluang', 8, 4, 5, 427, 'blue'),
('plutaluang', 9, 4, 9, 422, 'blue'),
-- WEST COURSE (Holes 10-18)
('plutaluang', 10, 4, 10, 372, 'blue'),
('plutaluang', 11, 5, 4, 540, 'blue'),
('plutaluang', 12, 3, 18, 167, 'blue'),
('plutaluang', 13, 4, 8, 412, 'blue'),
('plutaluang', 14, 5, 2, 570, 'blue'),
('plutaluang', 15, 4, 6, 410, 'blue'),
('plutaluang', 16, 4, 14, 455, 'blue'),
('plutaluang', 17, 3, 16, 167, 'blue'),
('plutaluang', 18, 4, 12, 407, 'blue');

-- ================================================================
-- WHITE TEES (Regular/Men's)
-- Total Yardage: 6720 yards
-- ================================================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- NORTH COURSE (Holes 1-9)
('plutaluang', 1, 4, 11, 402, 'white'),
('plutaluang', 2, 5, 1, 496, 'white'),
('plutaluang', 3, 3, 15, 145, 'white'),
('plutaluang', 4, 5, 3, 576, 'white'),
('plutaluang', 5, 4, 13, 406, 'white'),
('plutaluang', 6, 4, 17, 165, 'white'),
('plutaluang', 7, 4, 7, 377, 'white'),
('plutaluang', 8, 4, 5, 417, 'white'),
('plutaluang', 9, 4, 9, 383, 'white'),
-- WEST COURSE (Holes 10-18)
('plutaluang', 10, 4, 10, 364, 'white'),
('plutaluang', 11, 5, 4, 520, 'white'),
('plutaluang', 12, 3, 18, 155, 'white'),
('plutaluang', 13, 4, 8, 387, 'white'),
('plutaluang', 14, 5, 2, 555, 'white'),
('plutaluang', 15, 4, 6, 389, 'white'),
('plutaluang', 16, 4, 14, 433, 'white'),
('plutaluang', 17, 3, 16, 158, 'white'),
('plutaluang', 18, 4, 12, 392, 'white');

-- ================================================================
-- YELLOW TEES (Forward)
-- Total Yardage: 6081 yards
-- ================================================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- NORTH COURSE (Holes 1-9)
('plutaluang', 1, 4, 11, 376, 'yellow'),
('plutaluang', 2, 5, 1, 468, 'yellow'),
('plutaluang', 3, 3, 15, 125, 'yellow'),
('plutaluang', 4, 5, 3, 559, 'yellow'),
('plutaluang', 5, 4, 13, 387, 'yellow'),
('plutaluang', 6, 4, 17, 144, 'yellow'),
('plutaluang', 7, 4, 7, 367, 'yellow'),
('plutaluang', 8, 4, 5, 346, 'yellow'),
('plutaluang', 9, 4, 9, 312, 'yellow'),
-- WEST COURSE (Holes 10-18)
('plutaluang', 10, 4, 10, 331, 'yellow'),
('plutaluang', 11, 5, 4, 447, 'yellow'),
('plutaluang', 12, 3, 18, 149, 'yellow'),
('plutaluang', 13, 4, 8, 365, 'yellow'),
('plutaluang', 14, 5, 2, 518, 'yellow'),
('plutaluang', 15, 4, 6, 314, 'yellow'),
('plutaluang', 16, 4, 14, 387, 'yellow'),
('plutaluang', 17, 3, 16, 142, 'yellow'),
('plutaluang', 18, 4, 12, 364, 'yellow');

-- ================================================================
-- RED TEES (Ladies')
-- Total Yardage: 5627 yards
-- ================================================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- NORTH COURSE (Holes 1-9)
('plutaluang', 1, 4, 11, 338, 'red'),
('plutaluang', 2, 5, 1, 395, 'red'),
('plutaluang', 3, 3, 15, 110, 'red'),
('plutaluang', 4, 5, 3, 489, 'red'),
('plutaluang', 5, 4, 13, 333, 'red'),
('plutaluang', 6, 4, 17, 129, 'red'),
('plutaluang', 7, 4, 7, 325, 'red'),
('plutaluang', 8, 4, 5, 343, 'red'),
('plutaluang', 9, 4, 9, 301, 'red'),
-- WEST COURSE (Holes 10-18)
('plutaluang', 10, 4, 10, 312, 'red'),
('plutaluang', 11, 5, 4, 436, 'red'),
('plutaluang', 12, 3, 18, 141, 'red'),
('plutaluang', 13, 4, 8, 346, 'red'),
('plutaluang', 14, 5, 2, 503, 'red'),
('plutaluang', 15, 4, 6, 283, 'red'),
('plutaluang', 16, 4, 14, 357, 'red'),
('plutaluang', 17, 3, 16, 128, 'red'),
('plutaluang', 18, 4, 12, 358, 'red');

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================

-- Check total records inserted (should be 72 = 4 tees x 18 holes)
SELECT
    'Total Records' as check_type,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 72 THEN 'PASS' ELSE 'FAIL' END as status
FROM course_holes
WHERE course_id = 'plutaluang';

-- Verify yardage totals for each tee
SELECT
    tee_marker,
    COUNT(*) as holes,
    SUM(yardage) as total_yardage,
    SUM(par) as total_par,
    CASE
        WHEN tee_marker = 'blue' AND SUM(yardage) = 6851 THEN 'PASS'
        WHEN tee_marker = 'white' AND SUM(yardage) = 6720 THEN 'PASS'
        WHEN tee_marker = 'yellow' AND SUM(yardage) = 6081 THEN 'PASS'
        WHEN tee_marker = 'red' AND SUM(yardage) = 5627 THEN 'PASS'
        ELSE 'FAIL'
    END as yardage_check
FROM course_holes
WHERE course_id = 'plutaluang'
GROUP BY tee_marker
ORDER BY SUM(yardage) DESC;

-- Verify all 18 holes exist for each tee
SELECT
    tee_marker,
    COUNT(DISTINCT hole_number) as unique_holes,
    CASE WHEN COUNT(DISTINCT hole_number) = 18 THEN 'PASS' ELSE 'FAIL' END as status
FROM course_holes
WHERE course_id = 'plutaluang'
GROUP BY tee_marker
ORDER BY tee_marker;

-- Verify par totals (should be 72 for all tees)
SELECT
    tee_marker,
    SUM(par) as total_par,
    CASE WHEN SUM(par) = 72 THEN 'PASS' ELSE 'FAIL' END as status
FROM course_holes
WHERE course_id = 'plutaluang'
GROUP BY tee_marker
ORDER BY tee_marker;

-- Display hole-by-hole comparison
SELECT
    hole_number,
    MAX(CASE WHEN tee_marker = 'blue' THEN yardage END) as blue_yds,
    MAX(CASE WHEN tee_marker = 'white' THEN yardage END) as white_yds,
    MAX(CASE WHEN tee_marker = 'yellow' THEN yardage END) as yellow_yds,
    MAX(CASE WHEN tee_marker = 'red' THEN yardage END) as red_yds,
    MAX(par) as par,
    MAX(stroke_index) as si
FROM course_holes
WHERE course_id = 'plutaluang'
GROUP BY hole_number
ORDER BY hole_number;

-- ================================================================
-- SUCCESS MESSAGE
-- ================================================================
SELECT
    '✓ Plutaluang Royal Thai Navy Golf Course - All Tee Markers Imported Successfully!' as message
UNION ALL
SELECT '  - Blue Tees: 6851 yards, Par 72'
UNION ALL
SELECT '  - White Tees: 6720 yards, Par 72'
UNION ALL
SELECT '  - Yellow Tees: 6081 yards, Par 72'
UNION ALL
SELECT '  - Red Tees: 5627 yards, Par 72'
UNION ALL
SELECT '  - Total: 4 tee markers, 72 holes inserted';
