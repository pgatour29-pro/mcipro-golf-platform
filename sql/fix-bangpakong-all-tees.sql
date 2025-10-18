-- =====================================================
-- FIX BANGPAKONG RIVERSIDE COUNTRY CLUB - ALL TEE MARKERS
-- =====================================================
-- Correct data from actual scorecard
-- Includes: Black, Blue, White, Yellow, Red tees

DELETE FROM course_holes WHERE course_id = 'bangpakong';

-- =====================================================
-- BLACK TEES - 7140 yards
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('bangpakong', 1, 4, 13, 415, 'black'),
('bangpakong', 2, 4, 11, 420, 'black'),
('bangpakong', 3, 5, 15, 550, 'black'),
('bangpakong', 4, 3, 9, 210, 'black'),
('bangpakong', 5, 4, 3, 435, 'black'),
('bangpakong', 6, 4, 5, 430, 'black'),
('bangpakong', 7, 3, 17, 220, 'black'),
('bangpakong', 8, 4, 1, 445, 'black'),
('bangpakong', 9, 5, 7, 560, 'black'),
('bangpakong', 10, 4, 6, 400, 'black'),
('bangpakong', 11, 4, 12, 410, 'black'),
('bangpakong', 12, 5, 10, 540, 'black'),
('bangpakong', 13, 3, 14, 180, 'black'),
('bangpakong', 14, 4, 4, 440, 'black'),
('bangpakong', 15, 4, 16, 390, 'black'),
('bangpakong', 16, 3, 8, 195, 'black'),
('bangpakong', 17, 4, 18, 345, 'black'),
('bangpakong', 18, 5, 2, 555, 'black');

-- =====================================================
-- BLUE TEES - 6700 yards
-- =====================================================
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
('bangpakong', 10, 4, 6, 380, 'blue'),
('bangpakong', 11, 4, 12, 384, 'blue'),
('bangpakong', 12, 5, 10, 505, 'blue'),
('bangpakong', 13, 3, 14, 168, 'blue'),
('bangpakong', 14, 4, 4, 412, 'blue'),
('bangpakong', 15, 4, 16, 365, 'blue'),
('bangpakong', 16, 3, 8, 182, 'blue'),
('bangpakong', 17, 4, 18, 323, 'blue'),
('bangpakong', 18, 5, 2, 520, 'blue');

-- =====================================================
-- WHITE TEES - 6393 yards
-- =====================================================
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
('bangpakong', 17, 4, 18, 310, 'white'),
('bangpakong', 18, 5, 2, 505, 'white');

-- =====================================================
-- YELLOW TEES - 5851 yards
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('bangpakong', 1, 4, 13, 327, 'yellow'),
('bangpakong', 2, 4, 11, 334, 'yellow'),
('bangpakong', 3, 5, 15, 445, 'yellow'),
('bangpakong', 4, 3, 9, 160, 'yellow'),
('bangpakong', 5, 4, 3, 360, 'yellow'),
('bangpakong', 6, 4, 5, 347, 'yellow'),
('bangpakong', 7, 3, 17, 168, 'yellow'),
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

-- =====================================================
-- RED TEES - 5458 yards
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('bangpakong', 1, 4, 13, 322, 'red'),
('bangpakong', 2, 4, 11, 312, 'red'),
('bangpakong', 3, 5, 15, 422, 'red'),
('bangpakong', 4, 3, 9, 145, 'red'),
('bangpakong', 5, 4, 3, 347, 'red'),
('bangpakong', 6, 4, 5, 327, 'red'),
('bangpakong', 7, 3, 17, 158, 'red'),
('bangpakong', 8, 4, 1, 330, 'red'),
('bangpakong', 9, 5, 7, 446, 'red'),
('bangpakong', 10, 4, 6, 310, 'red'),
('bangpakong', 11, 4, 12, 320, 'red'),
('bangpakong', 12, 5, 10, 418, 'red'),
('bangpakong', 13, 3, 14, 128, 'red'),
('bangpakong', 14, 4, 4, 333, 'red'),
('bangpakong', 15, 4, 16, 300, 'red'),
('bangpakong', 16, 3, 8, 138, 'red'),
('bangpakong', 17, 4, 18, 267, 'red'),
('bangpakong', 18, 5, 2, 435, 'red');

SELECT tee_marker, SUM(yardage) as total, SUM(par) as par FROM course_holes WHERE course_id = 'bangpakong' GROUP BY tee_marker ORDER BY total DESC;
-- Expected: Black=7140, Blue=6700, White=6393, Yellow=5851, Red=5458, All Par 72
