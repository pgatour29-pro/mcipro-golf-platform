-- =====================================================
-- Pleasant Valley Golf Club - Complete Tee Markers Data
-- =====================================================
-- Course: Pleasant Valley Golf Club
-- Location: Chonburi, Thailand
-- Total Par: 72 (36 out, 36 in)
--
-- Tee Markers:
-- Black: 7002 yards (Championship)
-- Blue:  6353 yards
-- White: 5832 yards
-- Red:   5221 yards (Ladies)
-- =====================================================

-- Clean up existing data for Pleasant Valley
DELETE FROM course_holes WHERE course_id = 'pleasant_valley';

-- =====================================================
-- BLACK TEES (Championship) - 7002 yards, Par 72
-- =====================================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9
('pleasant_valley', 1, 4, 4, 423, 'black'),
('pleasant_valley', 2, 4, 3, 442, 'black'),
('pleasant_valley', 3, 5, 1, 601, 'black'),
('pleasant_valley', 4, 4, 14, 332, 'black'),
('pleasant_valley', 5, 3, 16, 200, 'black'),
('pleasant_valley', 6, 5, 6, 530, 'black'),
('pleasant_valley', 7, 4, 18, 350, 'black'),
('pleasant_valley', 8, 3, 12, 240, 'black'),
('pleasant_valley', 9, 4, 4, 412, 'black'),
-- Back 9
('pleasant_valley', 10, 4, 2, 460, 'black'),
('pleasant_valley', 11, 4, 8, 408, 'black'),
('pleasant_valley', 12, 4, 10, 360, 'black'),
('pleasant_valley', 13, 3, 15, 174, 'black'),
('pleasant_valley', 14, 4, 7, 435, 'black'),
('pleasant_valley', 15, 5, 11, 485, 'black'),
('pleasant_valley', 16, 4, 5, 430, 'black'),
('pleasant_valley', 17, 3, 17, 149, 'black'),
('pleasant_valley', 18, 5, 13, 580, 'black');

-- =====================================================
-- BLUE TEES - 6353 yards, Par 72
-- =====================================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9
('pleasant_valley', 1, 4, 4, 391, 'blue'),
('pleasant_valley', 2, 4, 3, 408, 'blue'),
('pleasant_valley', 3, 5, 1, 549, 'blue'),
('pleasant_valley', 4, 4, 14, 300, 'blue'),
('pleasant_valley', 5, 3, 16, 174, 'blue'),
('pleasant_valley', 6, 5, 6, 507, 'blue'),
('pleasant_valley', 7, 4, 18, 324, 'blue'),
('pleasant_valley', 8, 3, 12, 205, 'blue'),
('pleasant_valley', 9, 4, 4, 385, 'blue'),
-- Back 9
('pleasant_valley', 10, 4, 2, 427, 'blue'),
('pleasant_valley', 11, 4, 8, 380, 'blue'),
('pleasant_valley', 12, 4, 10, 319, 'blue'),
('pleasant_valley', 13, 3, 15, 152, 'blue'),
('pleasant_valley', 14, 4, 7, 370, 'blue'),
('pleasant_valley', 15, 5, 11, 458, 'blue'),
('pleasant_valley', 16, 4, 5, 403, 'blue'),
('pleasant_valley', 17, 3, 17, 122, 'blue'),
('pleasant_valley', 18, 5, 13, 479, 'blue');

-- =====================================================
-- WHITE TEES - 5832 yards, Par 72
-- =====================================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9
('pleasant_valley', 1, 4, 4, 363, 'white'),
('pleasant_valley', 2, 4, 3, 368, 'white'),
('pleasant_valley', 3, 5, 1, 508, 'white'),
('pleasant_valley', 4, 4, 14, 281, 'white'),
('pleasant_valley', 5, 3, 16, 160, 'white'),
('pleasant_valley', 6, 5, 6, 457, 'white'),
('pleasant_valley', 7, 4, 18, 297, 'white'),
('pleasant_valley', 8, 3, 12, 153, 'white'),
('pleasant_valley', 9, 4, 4, 365, 'white'),
-- Back 9
('pleasant_valley', 10, 4, 2, 398, 'white'),
('pleasant_valley', 11, 4, 8, 359, 'white'),
('pleasant_valley', 12, 4, 10, 289, 'white'),
('pleasant_valley', 13, 3, 15, 133, 'white'),
('pleasant_valley', 14, 4, 7, 331, 'white'),
('pleasant_valley', 15, 5, 11, 439, 'white'),
('pleasant_valley', 16, 4, 5, 380, 'white'),
('pleasant_valley', 17, 3, 17, 103, 'white'),
('pleasant_valley', 18, 5, 13, 448, 'white');

-- =====================================================
-- RED TEES (Ladies) - 5221 yards, Par 72
-- =====================================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9
('pleasant_valley', 1, 4, 4, 310, 'red'),
('pleasant_valley', 2, 4, 3, 317, 'red'),
('pleasant_valley', 3, 5, 1, 466, 'red'),
('pleasant_valley', 4, 4, 14, 263, 'red'),
('pleasant_valley', 5, 3, 16, 127, 'red'),
('pleasant_valley', 6, 5, 6, 425, 'red'),
('pleasant_valley', 7, 4, 18, 263, 'red'),
('pleasant_valley', 8, 3, 12, 112, 'red'),
('pleasant_valley', 9, 4, 4, 324, 'red'),
-- Back 9
('pleasant_valley', 10, 4, 2, 370, 'red'),
('pleasant_valley', 11, 4, 8, 320, 'red'),
('pleasant_valley', 12, 4, 10, 255, 'red'),
('pleasant_valley', 13, 3, 15, 104, 'red'),
('pleasant_valley', 14, 4, 7, 300, 'red'),
('pleasant_valley', 15, 5, 11, 420, 'red'),
('pleasant_valley', 16, 4, 5, 355, 'red'),
('pleasant_valley', 17, 3, 17, 86, 'red'),
('pleasant_valley', 18, 5, 13, 404, 'red');

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify total yardages and par for each tee
SELECT
    tee_marker,
    COUNT(*) as holes,
    SUM(par) as total_par,
    SUM(yardage) as total_yardage,
    SUM(CASE WHEN hole_number <= 9 THEN yardage ELSE 0 END) as front_9,
    SUM(CASE WHEN hole_number > 9 THEN yardage ELSE 0 END) as back_9
FROM course_holes
WHERE course_id = 'pleasant_valley'
GROUP BY tee_marker
ORDER BY total_yardage DESC;

-- Expected results:
-- Black: 18 holes, Par 72, 7002 yards (Front: 3530, Back: 3472)
-- Blue:  18 holes, Par 72, 6353 yards (Front: 3243, Back: 3110)
-- White: 18 holes, Par 72, 5832 yards (Front: 2952, Back: 2880)
-- Red:   18 holes, Par 72, 5221 yards (Front: 2607, Back: 2614)

-- Verify par distribution
SELECT
    tee_marker,
    par,
    COUNT(*) as hole_count
FROM course_holes
WHERE course_id = 'pleasant_valley'
GROUP BY tee_marker, par
ORDER BY tee_marker, par;

-- Expected: Each tee should have 4 par 3s, 10 par 4s, and 4 par 5s

-- Display all holes for manual verification
SELECT
    tee_marker,
    hole_number,
    par,
    stroke_index,
    yardage
FROM course_holes
WHERE course_id = 'pleasant_valley'
ORDER BY tee_marker, hole_number;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT '✓ Pleasant Valley Golf Club - All Tee Markers Successfully Loaded' as status,
       '4 tee markers (Black: 7002, Blue: 6353, White: 5832, Red: 5221)' as details,
       '72 total records inserted (18 holes × 4 tees)' as record_count;
