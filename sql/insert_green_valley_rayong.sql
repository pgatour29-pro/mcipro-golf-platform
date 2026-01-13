-- =====================================================
-- GREEN VALLEY RAYONG - Complete course insert for Live Scorecard
-- Run this in Supabase SQL Editor
-- =====================================================

-- STEP 1: Insert into courses table first (required for foreign key)
INSERT INTO courses (id, name, scorecard_url) VALUES
('green_valley_rayong', 'Green Valley Rayong Country Club', '/scorecard_profiles/green_valley_rayong.yaml')
ON CONFLICT (id) DO UPDATE SET
name = EXCLUDED.name,
scorecard_url = EXCLUDED.scorecard_url;

-- STEP 2: Delete any existing hole data for this course (clean slate)
DELETE FROM course_holes WHERE course_id = 'green_valley_rayong';

-- STEP 3: Insert hole data for BLUE tees (Championship - 6,971 yards)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('green_valley_rayong', 1, 4, 1, 448, 'blue'),
('green_valley_rayong', 2, 4, 13, 387, 'blue'),
('green_valley_rayong', 3, 4, 17, 382, 'blue'),
('green_valley_rayong', 4, 5, 7, 551, 'blue'),
('green_valley_rayong', 5, 3, 11, 220, 'blue'),
('green_valley_rayong', 6, 4, 9, 367, 'blue'),
('green_valley_rayong', 7, 5, 5, 584, 'blue'),
('green_valley_rayong', 8, 3, 15, 149, 'blue'),
('green_valley_rayong', 9, 4, 3, 414, 'blue'),
('green_valley_rayong', 10, 5, 6, 541, 'blue'),
('green_valley_rayong', 11, 3, 16, 179, 'blue'),
('green_valley_rayong', 12, 4, 14, 387, 'blue'),
('green_valley_rayong', 13, 4, 2, 448, 'blue'),
('green_valley_rayong', 14, 5, 8, 509, 'blue'),
('green_valley_rayong', 15, 4, 4, 434, 'blue'),
('green_valley_rayong', 16, 3, 18, 172, 'blue'),
('green_valley_rayong', 17, 4, 10, 382, 'blue'),
('green_valley_rayong', 18, 4, 12, 417, 'blue');

-- Insert hole data for WHITE tees (Men's Regular - 6,570 yards)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('green_valley_rayong', 1, 4, 1, 428, 'white'),
('green_valley_rayong', 2, 4, 13, 378, 'white'),
('green_valley_rayong', 3, 4, 17, 355, 'white'),
('green_valley_rayong', 4, 5, 7, 526, 'white'),
('green_valley_rayong', 5, 3, 11, 192, 'white'),
('green_valley_rayong', 6, 4, 9, 350, 'white'),
('green_valley_rayong', 7, 5, 5, 569, 'white'),
('green_valley_rayong', 8, 3, 15, 139, 'white'),
('green_valley_rayong', 9, 4, 3, 398, 'white'),
('green_valley_rayong', 10, 5, 6, 516, 'white'),
('green_valley_rayong', 11, 3, 16, 161, 'white'),
('green_valley_rayong', 12, 4, 14, 363, 'white'),
('green_valley_rayong', 13, 4, 2, 403, 'white'),
('green_valley_rayong', 14, 5, 8, 489, 'white'),
('green_valley_rayong', 15, 4, 4, 403, 'white'),
('green_valley_rayong', 16, 3, 18, 144, 'white'),
('green_valley_rayong', 17, 4, 10, 366, 'white'),
('green_valley_rayong', 18, 4, 12, 390, 'white');

-- Insert hole data for YELLOW tees (Senior - 6,032 yards)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('green_valley_rayong', 1, 4, 1, 373, 'yellow'),
('green_valley_rayong', 2, 4, 13, 360, 'yellow'),
('green_valley_rayong', 3, 4, 17, 322, 'yellow'),
('green_valley_rayong', 4, 5, 7, 489, 'yellow'),
('green_valley_rayong', 5, 3, 11, 159, 'yellow'),
('green_valley_rayong', 6, 4, 9, 328, 'yellow'),
('green_valley_rayong', 7, 5, 5, 545, 'yellow'),
('green_valley_rayong', 8, 3, 15, 124, 'yellow'),
('green_valley_rayong', 9, 4, 3, 377, 'yellow'),
('green_valley_rayong', 10, 5, 6, 482, 'yellow'),
('green_valley_rayong', 11, 3, 16, 134, 'yellow'),
('green_valley_rayong', 12, 4, 14, 333, 'yellow'),
('green_valley_rayong', 13, 4, 2, 362, 'yellow'),
('green_valley_rayong', 14, 5, 8, 428, 'yellow'),
('green_valley_rayong', 15, 4, 4, 385, 'yellow'),
('green_valley_rayong', 16, 3, 18, 125, 'yellow'),
('green_valley_rayong', 17, 4, 10, 344, 'yellow'),
('green_valley_rayong', 18, 4, 12, 362, 'yellow');

-- Insert hole data for RED tees (Ladies - 5,175 yards)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('green_valley_rayong', 1, 4, 1, 309, 'red'),
('green_valley_rayong', 2, 4, 13, 311, 'red'),
('green_valley_rayong', 3, 4, 17, 266, 'red'),
('green_valley_rayong', 4, 5, 7, 461, 'red'),
('green_valley_rayong', 5, 3, 11, 121, 'red'),
('green_valley_rayong', 6, 4, 9, 303, 'red'),
('green_valley_rayong', 7, 5, 5, 440, 'red'),
('green_valley_rayong', 8, 3, 15, 101, 'red'),
('green_valley_rayong', 9, 4, 3, 314, 'red'),
('green_valley_rayong', 10, 5, 6, 433, 'red'),
('green_valley_rayong', 11, 3, 16, 116, 'red'),
('green_valley_rayong', 12, 4, 14, 274, 'red'),
('green_valley_rayong', 13, 4, 2, 316, 'red'),
('green_valley_rayong', 14, 5, 8, 388, 'red'),
('green_valley_rayong', 15, 4, 4, 360, 'red'),
('green_valley_rayong', 16, 3, 18, 100, 'red'),
('green_valley_rayong', 17, 4, 10, 298, 'red'),
('green_valley_rayong', 18, 4, 12, 264, 'red');

-- STEP 4: Verify the insert
SELECT '=== COURSES TABLE ===' as section;
SELECT id, name FROM courses WHERE id = 'green_valley_rayong';

SELECT '=== COURSE HOLES SUMMARY ===' as section;
SELECT
  course_id,
  tee_marker,
  COUNT(*) as hole_count,
  SUM(par) as total_par,
  SUM(yardage) as total_yardage
FROM course_holes
WHERE course_id = 'green_valley_rayong'
GROUP BY course_id, tee_marker
ORDER BY
  CASE tee_marker
    WHEN 'blue' THEN 1
    WHEN 'white' THEN 2
    WHEN 'yellow' THEN 3
    WHEN 'red' THEN 4
  END;

-- Expected output:
-- course_id             | tee_marker | hole_count | total_par | total_yardage
-- green_valley_rayong   | blue       | 18         | 72        | 6971
-- green_valley_rayong   | white      | 18         | 72        | 6570
-- green_valley_rayong   | yellow     | 18         | 72        | 6032
-- green_valley_rayong   | red        | 18         | 72        | 5175
