-- Fix Bangpra International Golf Club - ALL Tee Markers Data
-- This script deletes existing data and inserts complete tee marker information

-- Delete existing tee markers for this course
DELETE FROM course_holes WHERE course_id = 'bangpra_international';

-- Insert BLACK tee markers (7405 yards)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('bangpra_international', 1, 4, 3, 439, 'black'),
('bangpra_international', 2, 3, 15, 230, 'black'),
('bangpra_international', 3, 4, 11, 480, 'black'),
('bangpra_international', 4, 4, 5, 459, 'black'),
('bangpra_international', 5, 5, 9, 537, 'black'),
('bangpra_international', 6, 4, 1, 401, 'black'),
('bangpra_international', 7, 5, 7, 623, 'black'),
('bangpra_international', 8, 3, 13, 221, 'black'),
('bangpra_international', 9, 4, 17, 398, 'black'),
('bangpra_international', 10, 4, 18, 418, 'black'),
('bangpra_international', 11, 5, 2, 569, 'black'),
('bangpra_international', 12, 3, 16, 222, 'black'),
('bangpra_international', 13, 4, 10, 401, 'black'),
('bangpra_international', 14, 4, 6, 411, 'black'),
('bangpra_international', 15, 5, 14, 565, 'black'),
('bangpra_international', 16, 4, 4, 372, 'black'),
('bangpra_international', 17, 3, 12, 224, 'black'),
('bangpra_international', 18, 4, 8, 435, 'black');

-- Insert BLUE tee markers (6964 yards)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('bangpra_international', 1, 4, 3, 424, 'blue'),
('bangpra_international', 2, 3, 15, 189, 'blue'),
('bangpra_international', 3, 4, 11, 447, 'blue'),
('bangpra_international', 4, 4, 5, 426, 'blue'),
('bangpra_international', 5, 5, 9, 516, 'blue'),
('bangpra_international', 6, 4, 1, 391, 'blue'),
('bangpra_international', 7, 5, 7, 579, 'blue'),
('bangpra_international', 8, 3, 13, 187, 'blue'),
('bangpra_international', 9, 4, 17, 364, 'blue'),
('bangpra_international', 10, 4, 18, 409, 'blue'),
('bangpra_international', 11, 5, 2, 566, 'blue'),
('bangpra_international', 12, 3, 16, 184, 'blue'),
('bangpra_international', 13, 4, 10, 360, 'blue'),
('bangpra_international', 14, 4, 6, 398, 'blue'),
('bangpra_international', 15, 5, 14, 543, 'blue'),
('bangpra_international', 16, 4, 4, 363, 'blue'),
('bangpra_international', 17, 3, 12, 206, 'blue'),
('bangpra_international', 18, 4, 8, 412, 'blue');

-- Insert WHITE tee markers (6496 yards)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('bangpra_international', 1, 4, 3, 400, 'white'),
('bangpra_international', 2, 3, 15, 162, 'white'),
('bangpra_international', 3, 4, 11, 414, 'white'),
('bangpra_international', 4, 4, 5, 398, 'white'),
('bangpra_international', 5, 5, 9, 480, 'white'),
('bangpra_international', 6, 4, 1, 373, 'white'),
('bangpra_international', 7, 5, 7, 560, 'white'),
('bangpra_international', 8, 3, 13, 151, 'white'),
('bangpra_international', 9, 4, 17, 353, 'white'),
('bangpra_international', 10, 4, 18, 392, 'white'),
('bangpra_international', 11, 5, 2, 539, 'white'),
('bangpra_international', 12, 3, 16, 154, 'white'),
('bangpra_international', 13, 4, 10, 339, 'white'),
('bangpra_international', 14, 4, 6, 384, 'white'),
('bangpra_international', 15, 5, 14, 505, 'white'),
('bangpra_international', 16, 4, 4, 329, 'white'),
('bangpra_international', 17, 3, 12, 182, 'white'),
('bangpra_international', 18, 4, 8, 381, 'white');

-- Insert SILVER tee markers (5519 yards)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('bangpra_international', 1, 4, 3, 348, 'silver'),
('bangpra_international', 2, 3, 15, 138, 'silver'),
('bangpra_international', 3, 4, 11, 352, 'silver'),
('bangpra_international', 4, 4, 5, 303, 'silver'),
('bangpra_international', 5, 5, 9, 459, 'silver'),
('bangpra_international', 6, 4, 1, 298, 'silver'),
('bangpra_international', 7, 5, 7, 473, 'silver'),
('bangpra_international', 8, 3, 13, 132, 'silver'),
('bangpra_international', 9, 4, 17, 251, 'silver'),
('bangpra_international', 10, 4, 18, 322, 'silver'),
('bangpra_international', 11, 5, 2, 446, 'silver'),
('bangpra_international', 12, 3, 16, 117, 'silver'),
('bangpra_international', 13, 4, 10, 282, 'silver'),
('bangpra_international', 14, 4, 6, 317, 'silver'),
('bangpra_international', 15, 5, 14, 463, 'silver'),
('bangpra_international', 16, 4, 4, 316, 'silver'),
('bangpra_international', 17, 3, 12, 149, 'silver'),
('bangpra_international', 18, 4, 8, 353, 'silver');

-- Insert RED tee markers (5483 yards)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('bangpra_international', 1, 4, 3, 346, 'red'),
('bangpra_international', 2, 3, 15, 136, 'red'),
('bangpra_international', 3, 4, 11, 350, 'red'),
('bangpra_international', 4, 4, 5, 301, 'red'),
('bangpra_international', 5, 5, 9, 457, 'red'),
('bangpra_international', 6, 4, 1, 296, 'red'),
('bangpra_international', 7, 5, 7, 471, 'red'),
('bangpra_international', 8, 3, 13, 130, 'red'),
('bangpra_international', 9, 4, 17, 249, 'red'),
('bangpra_international', 10, 4, 18, 320, 'red'),
('bangpra_international', 11, 5, 2, 444, 'red'),
('bangpra_international', 12, 3, 16, 115, 'red'),
('bangpra_international', 13, 4, 10, 280, 'red'),
('bangpra_international', 14, 4, 6, 315, 'red'),
('bangpra_international', 15, 5, 14, 461, 'red'),
('bangpra_international', 16, 4, 4, 314, 'red'),
('bangpra_international', 17, 3, 12, 147, 'red'),
('bangpra_international', 18, 4, 8, 351, 'red');

-- Verification queries to check totals
SELECT
    tee_marker,
    COUNT(*) as hole_count,
    SUM(par) as total_par,
    SUM(yardage) as total_yardage
FROM course_holes
WHERE course_id = 'bangpra_international'
GROUP BY tee_marker
ORDER BY total_yardage DESC;

-- Expected Results:
-- Black: 18 holes, Par 72, 7405 yards
-- Blue:  18 holes, Par 72, 6964 yards
-- White: 18 holes, Par 72, 6496 yards
-- Silver: 18 holes, Par 72, 5519 yards
-- Red:   18 holes, Par 72, 5483 yards

SELECT 'Bangpra International Golf Club - All 5 tee markers successfully inserted!' as status;
