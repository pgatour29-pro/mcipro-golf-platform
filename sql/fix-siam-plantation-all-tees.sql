-- ============================================================================
-- Siam Plantation Golf Club - Single 18-Hole Course
-- ============================================================================
-- Course: Pineapple (holes 1-9) + Sugar Cane (holes 10-18)
-- Course ID: siam_plantation
-- Tee Markers: Black, Blue, White, Red
-- Total Records: 72 (18 holes × 4 tee markers)
-- ============================================================================

-- Clean up existing data
DELETE FROM course_holes WHERE course_id = 'siam_plantation';

-- ============================================================================
-- BLACK TEES - Holes 1-18
-- ============================================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Holes 1-9: Pineapple Course
('siam_plantation', 1, 4, 5, 405, 'black'),
('siam_plantation', 2, 5, 8, 566, 'black'),
('siam_plantation', 3, 3, 3, 235, 'black'),
('siam_plantation', 4, 4, 4, 412, 'black'),
('siam_plantation', 5, 4, 9, 371, 'black'),
('siam_plantation', 6, 5, 2, 578, 'black'),
('siam_plantation', 7, 4, 1, 461, 'black'),
('siam_plantation', 8, 3, 7, 184, 'black'),
('siam_plantation', 9, 4, 6, 433, 'black'),
-- Holes 10-18: Sugar Cane Course
('siam_plantation', 10, 4, 8, 400, 'black'),
('siam_plantation', 11, 4, 7, 405, 'black'),
('siam_plantation', 12, 3, 5, 195, 'black'),
('siam_plantation', 13, 4, 2, 452, 'black'),
('siam_plantation', 14, 5, 6, 596, 'black'),
('siam_plantation', 15, 3, 4, 242, 'black'),
('siam_plantation', 16, 5, 9, 538, 'black'),
('siam_plantation', 17, 4, 3, 410, 'black'),
('siam_plantation', 18, 4, 1, 498, 'black');

-- ============================================================================
-- BLUE TEES - Holes 1-18
-- ============================================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Holes 1-9: Pineapple Course
('siam_plantation', 1, 4, 5, 375, 'blue'),
('siam_plantation', 2, 5, 8, 537, 'blue'),
('siam_plantation', 3, 3, 3, 197, 'blue'),
('siam_plantation', 4, 4, 4, 378, 'blue'),
('siam_plantation', 5, 4, 9, 347, 'blue'),
('siam_plantation', 6, 5, 2, 551, 'blue'),
('siam_plantation', 7, 4, 1, 421, 'blue'),
('siam_plantation', 8, 3, 7, 165, 'blue'),
('siam_plantation', 9, 4, 6, 400, 'blue'),
-- Holes 10-18: Sugar Cane Course
('siam_plantation', 10, 4, 8, 367, 'blue'),
('siam_plantation', 11, 4, 7, 374, 'blue'),
('siam_plantation', 12, 3, 5, 165, 'blue'),
('siam_plantation', 13, 4, 2, 418, 'blue'),
('siam_plantation', 14, 5, 6, 543, 'blue'),
('siam_plantation', 15, 3, 4, 199, 'blue'),
('siam_plantation', 16, 5, 9, 506, 'blue'),
('siam_plantation', 17, 4, 3, 381, 'blue'),
('siam_plantation', 18, 4, 1, 472, 'blue');

-- ============================================================================
-- WHITE TEES - Holes 1-18
-- ============================================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Holes 1-9: Pineapple Course
('siam_plantation', 1, 4, 5, 287, 'white'),
('siam_plantation', 2, 5, 8, 475, 'white'),
('siam_plantation', 3, 3, 3, 164, 'white'),
('siam_plantation', 4, 4, 4, 343, 'white'),
('siam_plantation', 5, 4, 9, 316, 'white'),
('siam_plantation', 6, 5, 2, 512, 'white'),
('siam_plantation', 7, 4, 1, 382, 'white'),
('siam_plantation', 8, 3, 7, 145, 'white'),
('siam_plantation', 9, 4, 6, 361, 'white'),
-- Holes 10-18: Sugar Cane Course
('siam_plantation', 10, 4, 8, 296, 'white'),
('siam_plantation', 11, 4, 7, 347, 'white'),
('siam_plantation', 12, 3, 5, 132, 'white'),
('siam_plantation', 13, 4, 2, 390, 'white'),
('siam_plantation', 14, 5, 6, 497, 'white'),
('siam_plantation', 15, 3, 4, 168, 'white'),
('siam_plantation', 16, 5, 9, 465, 'white'),
('siam_plantation', 17, 4, 3, 348, 'white'),
('siam_plantation', 18, 4, 1, 427, 'white');

-- ============================================================================
-- RED TEES - Holes 1-18
-- ============================================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Holes 1-9: Pineapple Course
('siam_plantation', 1, 4, 5, 251, 'red'),
('siam_plantation', 2, 5, 8, 430, 'red'),
('siam_plantation', 3, 3, 3, 114, 'red'),
('siam_plantation', 4, 4, 4, 281, 'red'),
('siam_plantation', 5, 4, 9, 286, 'red'),
('siam_plantation', 6, 5, 2, 437, 'red'),
('siam_plantation', 7, 4, 1, 325, 'red'),
('siam_plantation', 8, 3, 7, 118, 'red'),
('siam_plantation', 9, 4, 6, 301, 'red'),
-- Holes 10-18: Sugar Cane Course
('siam_plantation', 10, 4, 8, 258, 'red'),
('siam_plantation', 11, 4, 7, 301, 'red'),
('siam_plantation', 12, 3, 5, 117, 'red'),
('siam_plantation', 13, 4, 2, 302, 'red'),
('siam_plantation', 14, 5, 6, 424, 'red'),
('siam_plantation', 15, 3, 4, 115, 'red'),
('siam_plantation', 16, 5, 9, 432, 'red'),
('siam_plantation', 17, 4, 3, 291, 'red'),
('siam_plantation', 18, 4, 1, 358, 'red');
