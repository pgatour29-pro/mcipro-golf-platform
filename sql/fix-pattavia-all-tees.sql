-- =====================================================
-- FIX PATTAVIA GOLF CLUB
-- =====================================================
-- Correct data from actual scorecard
-- Includes: Blue, White, Red tees

DELETE FROM course_holes WHERE course_id = 'pattavia';

-- =====================================================
-- BLUE TEES - 7111 yards
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('pattavia', 1, 4, 13, 398, 'blue'),
('pattavia', 2, 4, 9, 413, 'blue'),
('pattavia', 3, 5, 7, 595, 'blue'),
('pattavia', 4, 3, 17, 150, 'blue'),
('pattavia', 5, 4, 15, 392, 'blue'),
('pattavia', 6, 5, 1, 575, 'blue'),
('pattavia', 7, 3, 3, 249, 'blue'),
('pattavia', 8, 4, 5, 397, 'blue'),
('pattavia', 9, 4, 11, 437, 'blue'),
('pattavia', 10, 4, 16, 408, 'blue'),
('pattavia', 11, 4, 10, 367, 'blue'),
('pattavia', 12, 5, 4, 569, 'blue'),
('pattavia', 13, 3, 18, 157, 'blue'),
('pattavia', 14, 4, 12, 409, 'blue'),
('pattavia', 15, 4, 14, 388, 'blue'),
('pattavia', 16, 4, 2, 465, 'blue'),
('pattavia', 17, 3, 6, 225, 'blue'),
('pattavia', 18, 5, 8, 517, 'blue');

-- =====================================================
-- WHITE TEES - 6639 yards
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('pattavia', 1, 4, 13, 369, 'white'),
('pattavia', 2, 4, 9, 383, 'white'),
('pattavia', 3, 5, 7, 570, 'white'),
('pattavia', 4, 3, 17, 138, 'white'),
('pattavia', 5, 4, 15, 374, 'white'),
('pattavia', 6, 5, 1, 551, 'white'),
('pattavia', 7, 3, 3, 227, 'white'),
('pattavia', 8, 4, 5, 372, 'white'),
('pattavia', 9, 4, 11, 394, 'white'),
('pattavia', 10, 4, 16, 389, 'white'),
('pattavia', 11, 4, 10, 333, 'white'),
('pattavia', 12, 5, 4, 533, 'white'),
('pattavia', 13, 3, 18, 139, 'white'),
('pattavia', 14, 4, 12, 376, 'white'),
('pattavia', 15, 4, 14, 358, 'white'),
('pattavia', 16, 4, 2, 438, 'white'),
('pattavia', 17, 3, 6, 203, 'white'),
('pattavia', 18, 5, 8, 492, 'white');

-- =====================================================
-- RED TEES - 5580 yards
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('pattavia', 1, 4, 13, 332, 'red'),
('pattavia', 2, 4, 9, 325, 'red'),
('pattavia', 3, 5, 7, 473, 'red'),
('pattavia', 4, 3, 17, 93, 'red'),
('pattavia', 5, 4, 15, 305, 'red'),
('pattavia', 6, 5, 1, 481, 'red'),
('pattavia', 7, 3, 3, 160, 'red'),
('pattavia', 8, 4, 5, 318, 'red'),
('pattavia', 9, 4, 11, 343, 'red'),
('pattavia', 10, 4, 16, 353, 'red'),
('pattavia', 11, 4, 10, 282, 'red'),
('pattavia', 12, 5, 4, 448, 'red'),
('pattavia', 13, 3, 18, 107, 'red'),
('pattavia', 14, 4, 12, 302, 'red'),
('pattavia', 15, 4, 14, 306, 'red'),
('pattavia', 16, 4, 2, 366, 'red'),
('pattavia', 17, 3, 6, 152, 'red'),
('pattavia', 18, 5, 8, 434, 'red');

SELECT tee_marker, SUM(yardage) as total, SUM(par) as par FROM course_holes WHERE course_id = 'pattavia' GROUP BY tee_marker ORDER BY total DESC;
-- Expected: Blue=7111, White=6639, Red=5580, All Par 72
