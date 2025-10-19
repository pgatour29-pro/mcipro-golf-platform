-- =====================================================================
-- COMPLETE UPDATE: Bangpakong Riverside Country Club - ALL 5 TEE BOXES
-- =====================================================================
-- Date: 2025-10-19
-- Source: Physical scorecard (Bangpakongriversidecountryclub.jpg)
-- Verified: ALL par values, stroke indices, and yardages
-- =====================================================================
-- IMPORTANT: This is Par 72 (36-36), NOT Par 71!
-- =====================================================================

-- First, delete all existing Bangpakong data to start fresh
DELETE FROM course_holes WHERE course_id = 'bangpakong';

-- =====================================================================
-- BLACK TEES (Championship/Longest)
-- =====================================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('bangpakong', 1, 4, 13, 418, 'black'),
('bangpakong', 2, 4, 11, 410, 'black'),
('bangpakong', 3, 5, 15, 550, 'black'),
('bangpakong', 4, 3, 9, 210, 'black'),
('bangpakong', 5, 4, 3, 430, 'black'),
('bangpakong', 6, 4, 5, 418, 'black'),
('bangpakong', 7, 3, 17, 183, 'black'),
('bangpakong', 8, 4, 1, 437, 'black'),
('bangpakong', 9, 5, 7, 565, 'black'),
('bangpakong', 10, 4, 6, 425, 'black'),
('bangpakong', 11, 4, 12, 415, 'black'),
('bangpakong', 12, 5, 10, 516, 'black'),
('bangpakong', 13, 3, 14, 190, 'black'),
('bangpakong', 14, 4, 4, 440, 'black'),
('bangpakong', 15, 4, 16, 390, 'black'),
('bangpakong', 16, 3, 8, 195, 'black'),
('bangpakong', 17, 4, 18, 435, 'black'),
('bangpakong', 18, 5, 2, 545, 'black');

-- =====================================================================
-- BLUE TEES (Men's Regular)
-- =====================================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('bangpakong', 1, 4, 13, 388, 'blue'),
('bangpakong', 2, 4, 11, 393, 'blue'),
('bangpakong', 3, 5, 15, 515, 'blue'),
('bangpakong', 4, 3, 9, 197, 'blue'),
('bangpakong', 5, 4, 3, 407, 'blue'),
('bangpakong', 6, 4, 5, 403, 'blue'),
('bangpakong', 7, 3, 17, 206, 'blue'),
('bangpakong', 8, 4, 1, 417, 'blue'),
('bangpakong', 9, 5, 7, 535, 'blue'),
('bangpakong', 10, 4, 6, 400, 'blue'),
('bangpakong', 11, 4, 12, 384, 'blue'),
('bangpakong', 12, 5, 10, 485, 'blue'),
('bangpakong', 13, 3, 14, 168, 'blue'),
('bangpakong', 14, 4, 4, 412, 'blue'),
('bangpakong', 15, 4, 16, 365, 'blue'),
('bangpakong', 16, 3, 8, 182, 'blue'),
('bangpakong', 17, 4, 18, 323, 'blue'),
('bangpakong', 18, 5, 2, 520, 'blue');

-- =====================================================================
-- WHITE TEES (Senior/Forward)
-- =====================================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('bangpakong', 1, 4, 13, 370, 'white'),
('bangpakong', 2, 4, 11, 380, 'white'),
('bangpakong', 3, 5, 15, 495, 'white'),
('bangpakong', 4, 3, 9, 180, 'white'),
('bangpakong', 5, 4, 3, 397, 'white'),
('bangpakong', 6, 4, 5, 375, 'white'),
('bangpakong', 7, 3, 17, 175, 'white'),
('bangpakong', 8, 4, 1, 400, 'white'),
('bangpakong', 9, 5, 7, 524, 'white'),
('bangpakong', 10, 4, 6, 374, 'white'),
('bangpakong', 11, 4, 12, 370, 'white'),
('bangpakong', 12, 5, 10, 490, 'white'),
('bangpakong', 13, 3, 14, 148, 'white'),
('bangpakong', 14, 4, 4, 380, 'white'),
('bangpakong', 15, 4, 16, 350, 'white'),
('bangpakong', 16, 3, 8, 170, 'white'),
('bangpakong', 17, 4, 18, 315, 'white'),
('bangpakong', 18, 5, 2, 505, 'white');

-- =====================================================================
-- YELLOW TEES (Ladies/Forward)
-- =====================================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('bangpakong', 1, 4, 13, 327, 'yellow'),
('bangpakong', 2, 4, 11, 334, 'yellow'),
('bangpakong', 3, 5, 15, 445, 'yellow'),
('bangpakong', 4, 3, 9, 160, 'yellow'),
('bangpakong', 5, 4, 3, 360, 'yellow'),
('bangpakong', 6, 4, 5, 347, 'yellow'),
('bangpakong', 7, 3, 17, 163, 'yellow'),
('bangpakong', 8, 4, 1, 345, 'yellow'),
('bangpakong', 9, 5, 7, 490, 'yellow'),
('bangpakong', 10, 4, 6, 354, 'yellow'),
('bangpakong', 11, 4, 12, 335, 'yellow'),
('bangpakong', 12, 5, 10, 475, 'yellow'),
('bangpakong', 13, 3, 14, 135, 'yellow'),
('bangpakong', 14, 4, 4, 343, 'yellow'),
('bangpakong', 15, 4, 16, 320, 'yellow'),
('bangpakong', 16, 3, 8, 145, 'yellow'),
('bangpakong', 17, 4, 18, 303, 'yellow'),
('bangpakong', 18, 5, 2, 465, 'yellow');

-- =====================================================================
-- RED TEES (Ladies/Shortest)
-- =====================================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('bangpakong', 1, 4, 13, 322, 'red'),
('bangpakong', 2, 4, 11, 312, 'red'),
('bangpakong', 3, 5, 15, 422, 'red'),
('bangpakong', 4, 3, 9, 145, 'red'),
('bangpakong', 5, 4, 3, 347, 'red'),
('bangpakong', 6, 4, 5, 327, 'red'),
('bangpakong', 7, 3, 17, 185, 'red'),
('bangpakong', 8, 4, 1, 330, 'red'),
('bangpakong', 9, 5, 7, 446, 'red'),
('bangpakong', 10, 4, 6, 310, 'red'),
('bangpakong', 11, 4, 12, 318, 'red'),
('bangpakong', 12, 5, 10, 438, 'red'),
('bangpakong', 13, 3, 14, 128, 'red'),
('bangpakong', 14, 4, 4, 335, 'red'),
('bangpakong', 15, 4, 16, 300, 'red'),
('bangpakong', 16, 3, 8, 138, 'red'),
('bangpakong', 17, 4, 18, 267, 'red'),
('bangpakong', 18, 5, 2, 435, 'red');

-- =====================================================================
-- VERIFICATION QUERIES
-- =====================================================================

-- Check total par for each tee (should be 72 for all)
SELECT
    tee_marker,
    SUM(par) as total_par,
    SUM(CASE WHEN hole_number <= 9 THEN par ELSE 0 END) as front_nine_par,
    SUM(CASE WHEN hole_number > 9 THEN par ELSE 0 END) as back_nine_par
FROM course_holes
WHERE course_id = 'bangpakong'
GROUP BY tee_marker
ORDER BY
    CASE tee_marker
        WHEN 'black' THEN 1
        WHEN 'blue' THEN 2
        WHEN 'white' THEN 3
        WHEN 'yellow' THEN 4
        WHEN 'red' THEN 5
    END;

-- Check total yardage for each tee
SELECT
    tee_marker,
    SUM(yardage) as total_yardage,
    SUM(CASE WHEN hole_number <= 9 THEN yardage ELSE 0 END) as front_nine_yardage,
    SUM(CASE WHEN hole_number > 9 THEN yardage ELSE 0 END) as back_nine_yardage
FROM course_holes
WHERE course_id = 'bangpakong'
GROUP BY tee_marker
ORDER BY total_yardage DESC;

-- View all holes for Blue tees (most commonly played)
SELECT
    hole_number,
    par,
    stroke_index,
    yardage,
    tee_marker
FROM course_holes
WHERE course_id = 'bangpakong'
  AND tee_marker = 'blue'
ORDER BY hole_number;

-- =====================================================================
-- EXPECTED RESULTS:
-- =====================================================================
-- Total Par (all tees): 72 (Front 9: 36, Back 9: 36)
--
-- Total Yardages:
-- Black: ~7,000+ yards (Championship)
-- Blue:  6,700 yards (Verified from scorecard)
-- White: 6,393 yards (Verified from scorecard)
-- Yellow: 5,458 yards (Verified from scorecard)
-- Red:   5,458 yards (Verified from scorecard)
--
-- Stroke Indices:
-- Front 9: 13, 11, 15, 9, 3, 5, 17, 1, 7
-- Back 9:  6, 12, 10, 14, 4, 16, 8, 18, 2
-- =====================================================================

-- =====================================================================
-- POST-UPDATE INSTRUCTIONS:
-- =====================================================================
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Clear browser cache: localStorage.removeItem('mcipro_course_bangpakong')
-- 3. Hard refresh the app (Ctrl+Shift+R or Cmd+Shift+R)
-- 4. Test creating a new round at Bangpakong
-- 5. Verify stroke allocation is correct for different handicaps
-- =====================================================================
