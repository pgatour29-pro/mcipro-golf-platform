-- ============================================================================
-- Laem Chabang International Country Club - 3 Course Combinations
-- ============================================================================
-- This creates 3 separate 18-hole courses from the 27-hole facility:
--   1. Mountain+Lake: Mountain (holes 1-9) + Lake (holes 10-18)
--   2. Mountain+Valley: Mountain (holes 1-9) + Valley (holes 10-18)
--   3. Lake+Valley: Lake (holes 1-9) + Valley (holes 10-18)
--
-- All 5 tee markers (black, blue, white, red, yellow) for all combinations
-- All holes numbered 1-18 to comply with database constraints
-- ============================================================================

BEGIN;

-- ============================================================================
-- Step 1: Clean up existing data
-- ============================================================================

DELETE FROM course_holes WHERE course_id IN ('laem_chabang_mountain_lake', 'laem_chabang_mountain_valley', 'laem_chabang_lake_valley');

-- ============================================================================
-- Step 2: Insert Course 1 - Mountain+Lake (18 holes)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- MOUNTAIN+LAKE - BLACK TEES
-- ----------------------------------------------------------------------------

-- Mountain (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('laem_chabang_mountain_lake', 1, 4, 3, 339, 'black'),
('laem_chabang_mountain_lake', 2, 4, 4, 175, 'black'),
('laem_chabang_mountain_lake', 3, 6, 6, 439, 'black'),
('laem_chabang_mountain_lake', 4, 8, 8, 328, 'black'),
('laem_chabang_mountain_lake', 5, 9, 9, 412, 'black'),
('laem_chabang_mountain_lake', 6, 2, 2, 384, 'black'),
('laem_chabang_mountain_lake', 7, 7, 7, 212, 'black'),
('laem_chabang_mountain_lake', 8, 5, 5, 536, 'black'),
('laem_chabang_mountain_lake', 9, 1, 1, 421, 'black');

-- Lake (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('laem_chabang_mountain_lake', 10, 5, 5, 380, 'black'),
('laem_chabang_mountain_lake', 11, 3, 3, 518, 'black'),
('laem_chabang_mountain_lake', 12, 2, 2, 422, 'black'),
('laem_chabang_mountain_lake', 13, 9, 9, 363, 'black'),
('laem_chabang_mountain_lake', 14, 7, 7, 212, 'black'),
('laem_chabang_mountain_lake', 15, 1, 1, 441, 'black'),
('laem_chabang_mountain_lake', 16, 6, 6, 378, 'black'),
('laem_chabang_mountain_lake', 17, 8, 8, 184, 'black'),
('laem_chabang_mountain_lake', 18, 4, 4, 521, 'black');

-- ----------------------------------------------------------------------------
-- MOUNTAIN+LAKE - BLUE TEES
-- ----------------------------------------------------------------------------

-- Mountain (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('laem_chabang_mountain_lake', 1, 4, 3, 336, 'blue'),
('laem_chabang_mountain_lake', 2, 4, 4, 164, 'blue'),
('laem_chabang_mountain_lake', 3, 6, 6, 422, 'blue'),
('laem_chabang_mountain_lake', 4, 8, 8, 302, 'blue'),
('laem_chabang_mountain_lake', 5, 9, 9, 397, 'blue'),
('laem_chabang_mountain_lake', 6, 2, 2, 368, 'blue'),
('laem_chabang_mountain_lake', 7, 7, 7, 196, 'blue'),
('laem_chabang_mountain_lake', 8, 5, 5, 517, 'blue'),
('laem_chabang_mountain_lake', 9, 1, 1, 396, 'blue');

-- Lake (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('laem_chabang_mountain_lake', 10, 5, 5, 361, 'blue'),
('laem_chabang_mountain_lake', 11, 3, 3, 505, 'blue'),
('laem_chabang_mountain_lake', 12, 2, 2, 407, 'blue'),
('laem_chabang_mountain_lake', 13, 9, 9, 348, 'blue'),
('laem_chabang_mountain_lake', 14, 7, 7, 191, 'blue'),
('laem_chabang_mountain_lake', 15, 1, 1, 428, 'blue'),
('laem_chabang_mountain_lake', 16, 6, 6, 354, 'blue'),
('laem_chabang_mountain_lake', 17, 8, 8, 165, 'blue'),
('laem_chabang_mountain_lake', 18, 4, 4, 506, 'blue');

-- ----------------------------------------------------------------------------
-- MOUNTAIN+LAKE - WHITE TEES
-- ----------------------------------------------------------------------------

-- Mountain (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('laem_chabang_mountain_lake', 1, 4, 3, 306, 'white'),
('laem_chabang_mountain_lake', 2, 4, 4, 163, 'white'),
('laem_chabang_mountain_lake', 3, 6, 6, 375, 'white'),
('laem_chabang_mountain_lake', 4, 8, 8, 475, 'white'),
('laem_chabang_mountain_lake', 5, 9, 9, 375, 'white'),
('laem_chabang_mountain_lake', 6, 2, 2, 351, 'white'),
('laem_chabang_mountain_lake', 7, 7, 7, 174, 'white'),
('laem_chabang_mountain_lake', 8, 5, 5, 455, 'white'),
('laem_chabang_mountain_lake', 9, 1, 1, 376, 'white');

-- Lake (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('laem_chabang_mountain_lake', 10, 5, 5, 333, 'white'),
('laem_chabang_mountain_lake', 11, 3, 3, 488, 'white'),
('laem_chabang_mountain_lake', 12, 2, 2, 368, 'white'),
('laem_chabang_mountain_lake', 13, 9, 9, 313, 'white'),
('laem_chabang_mountain_lake', 14, 7, 7, 167, 'white'),
('laem_chabang_mountain_lake', 15, 1, 1, 402, 'white'),
('laem_chabang_mountain_lake', 16, 6, 6, 330, 'white'),
('laem_chabang_mountain_lake', 17, 8, 8, 143, 'white'),
('laem_chabang_mountain_lake', 18, 4, 4, 488, 'white');

-- ----------------------------------------------------------------------------
-- MOUNTAIN+LAKE - RED TEES
-- ----------------------------------------------------------------------------

-- Mountain (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('laem_chabang_mountain_lake', 1, 4, 3, 288, 'red'),
('laem_chabang_mountain_lake', 2, 4, 4, 134, 'red'),
('laem_chabang_mountain_lake', 3, 6, 6, 364, 'red'),
('laem_chabang_mountain_lake', 4, 8, 8, 440, 'red'),
('laem_chabang_mountain_lake', 5, 9, 9, 357, 'red'),
('laem_chabang_mountain_lake', 6, 2, 2, 304, 'red'),
('laem_chabang_mountain_lake', 7, 7, 7, 161, 'red'),
('laem_chabang_mountain_lake', 8, 5, 5, 428, 'red'),
('laem_chabang_mountain_lake', 9, 1, 1, 296, 'red');

-- Lake (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('laem_chabang_mountain_lake', 10, 5, 5, 293, 'red'),
('laem_chabang_mountain_lake', 11, 3, 3, 455, 'red'),
('laem_chabang_mountain_lake', 12, 2, 2, 339, 'red'),
('laem_chabang_mountain_lake', 13, 9, 9, 249, 'red'),
('laem_chabang_mountain_lake', 14, 7, 7, 142, 'red'),
('laem_chabang_mountain_lake', 15, 1, 1, 377, 'red'),
('laem_chabang_mountain_lake', 16, 6, 6, 264, 'red'),
('laem_chabang_mountain_lake', 17, 8, 8, 125, 'red'),
('laem_chabang_mountain_lake', 18, 4, 4, 462, 'red');

-- ----------------------------------------------------------------------------
-- MOUNTAIN+LAKE - YELLOW TEES
-- ----------------------------------------------------------------------------

-- Mountain (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('laem_chabang_mountain_lake', 1, 4, 3, 230, 'yellow'),
('laem_chabang_mountain_lake', 2, 4, 4, 97, 'yellow'),
('laem_chabang_mountain_lake', 3, 6, 6, 342, 'yellow'),
('laem_chabang_mountain_lake', 4, 8, 8, 406, 'yellow'),
('laem_chabang_mountain_lake', 5, 9, 9, 256, 'yellow'),
('laem_chabang_mountain_lake', 6, 2, 2, 267, 'yellow'),
('laem_chabang_mountain_lake', 7, 7, 7, 128, 'yellow'),
('laem_chabang_mountain_lake', 8, 5, 5, 348, 'yellow'),
('laem_chabang_mountain_lake', 9, 1, 1, 245, 'yellow');

-- Lake (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('laem_chabang_mountain_lake', 10, 5, 5, 265, 'yellow'),
('laem_chabang_mountain_lake', 11, 3, 3, 431, 'yellow'),
('laem_chabang_mountain_lake', 12, 2, 2, 280, 'yellow'),
('laem_chabang_mountain_lake', 13, 9, 9, 233, 'yellow'),
('laem_chabang_mountain_lake', 14, 7, 7, 118, 'yellow'),
('laem_chabang_mountain_lake', 15, 1, 1, 350, 'yellow'),
('laem_chabang_mountain_lake', 16, 6, 6, 230, 'yellow'),
('laem_chabang_mountain_lake', 17, 8, 8, 102, 'yellow'),
('laem_chabang_mountain_lake', 18, 4, 4, 382, 'yellow');

-- ============================================================================
-- Step 3: Insert Course 2 - Mountain+Valley (18 holes)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- MOUNTAIN+VALLEY - BLACK TEES
-- ----------------------------------------------------------------------------

-- Mountain (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('laem_chabang_mountain_valley', 1, 4, 3, 339, 'black'),
('laem_chabang_mountain_valley', 2, 4, 4, 175, 'black'),
('laem_chabang_mountain_valley', 3, 6, 6, 439, 'black'),
('laem_chabang_mountain_valley', 4, 8, 8, 328, 'black'),
('laem_chabang_mountain_valley', 5, 9, 9, 412, 'black'),
('laem_chabang_mountain_valley', 6, 2, 2, 384, 'black'),
('laem_chabang_mountain_valley', 7, 7, 7, 212, 'black'),
('laem_chabang_mountain_valley', 8, 5, 5, 536, 'black'),
('laem_chabang_mountain_valley', 9, 1, 1, 421, 'black');

-- Valley (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('laem_chabang_mountain_valley', 10, 4, 4, 438, 'black'),
('laem_chabang_mountain_valley', 11, 3, 3, 538, 'black'),
('laem_chabang_mountain_valley', 12, 2, 2, 420, 'black'),
('laem_chabang_mountain_valley', 13, 1, 1, 454, 'black'),
('laem_chabang_mountain_valley', 14, 8, 8, 205, 'black'),
('laem_chabang_mountain_valley', 15, 6, 6, 550, 'black'),
('laem_chabang_mountain_valley', 16, 7, 7, 419, 'black'),
('laem_chabang_mountain_valley', 17, 9, 9, 168, 'black'),
('laem_chabang_mountain_valley', 18, 5, 5, 427, 'black');

-- ----------------------------------------------------------------------------
-- MOUNTAIN+VALLEY - BLUE TEES
-- ----------------------------------------------------------------------------

-- Mountain (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('laem_chabang_mountain_valley', 1, 4, 3, 336, 'blue'),
('laem_chabang_mountain_valley', 2, 4, 4, 164, 'blue'),
('laem_chabang_mountain_valley', 3, 6, 6, 422, 'blue'),
('laem_chabang_mountain_valley', 4, 8, 8, 302, 'blue'),
('laem_chabang_mountain_valley', 5, 9, 9, 397, 'blue'),
('laem_chabang_mountain_valley', 6, 2, 2, 368, 'blue'),
('laem_chabang_mountain_valley', 7, 7, 7, 196, 'blue'),
('laem_chabang_mountain_valley', 8, 5, 5, 517, 'blue'),
('laem_chabang_mountain_valley', 9, 1, 1, 396, 'blue');

-- Valley (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('laem_chabang_mountain_valley', 10, 4, 4, 420, 'blue'),
('laem_chabang_mountain_valley', 11, 3, 3, 515, 'blue'),
('laem_chabang_mountain_valley', 12, 2, 2, 397, 'blue'),
('laem_chabang_mountain_valley', 13, 1, 1, 424, 'blue'),
('laem_chabang_mountain_valley', 14, 8, 8, 195, 'blue'),
('laem_chabang_mountain_valley', 15, 6, 6, 520, 'blue'),
('laem_chabang_mountain_valley', 16, 7, 7, 414, 'blue'),
('laem_chabang_mountain_valley', 17, 9, 9, 156, 'blue'),
('laem_chabang_mountain_valley', 18, 5, 5, 415, 'blue');

-- ----------------------------------------------------------------------------
-- MOUNTAIN+VALLEY - WHITE TEES
-- ----------------------------------------------------------------------------

-- Mountain (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('laem_chabang_mountain_valley', 1, 4, 3, 306, 'white'),
('laem_chabang_mountain_valley', 2, 4, 4, 163, 'white'),
('laem_chabang_mountain_valley', 3, 6, 6, 375, 'white'),
('laem_chabang_mountain_valley', 4, 8, 8, 475, 'white'),
('laem_chabang_mountain_valley', 5, 9, 9, 375, 'white'),
('laem_chabang_mountain_valley', 6, 2, 2, 351, 'white'),
('laem_chabang_mountain_valley', 7, 7, 7, 174, 'white'),
('laem_chabang_mountain_valley', 8, 5, 5, 455, 'white'),
('laem_chabang_mountain_valley', 9, 1, 1, 376, 'white');

-- Valley (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('laem_chabang_mountain_valley', 10, 4, 4, 398, 'white'),
('laem_chabang_mountain_valley', 11, 3, 3, 482, 'white'),
('laem_chabang_mountain_valley', 12, 2, 2, 374, 'white'),
('laem_chabang_mountain_valley', 13, 1, 1, 401, 'white'),
('laem_chabang_mountain_valley', 14, 8, 8, 180, 'white'),
('laem_chabang_mountain_valley', 15, 6, 6, 491, 'white'),
('laem_chabang_mountain_valley', 16, 7, 7, 392, 'white'),
('laem_chabang_mountain_valley', 17, 9, 9, 143, 'white'),
('laem_chabang_mountain_valley', 18, 5, 5, 394, 'white');

-- ----------------------------------------------------------------------------
-- MOUNTAIN+VALLEY - RED TEES
-- ----------------------------------------------------------------------------

-- Mountain (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('laem_chabang_mountain_valley', 1, 4, 3, 288, 'red'),
('laem_chabang_mountain_valley', 2, 4, 4, 134, 'red'),
('laem_chabang_mountain_valley', 3, 6, 6, 364, 'red'),
('laem_chabang_mountain_valley', 4, 8, 8, 440, 'red'),
('laem_chabang_mountain_valley', 5, 9, 9, 357, 'red'),
('laem_chabang_mountain_valley', 6, 2, 2, 304, 'red'),
('laem_chabang_mountain_valley', 7, 7, 7, 161, 'red'),
('laem_chabang_mountain_valley', 8, 5, 5, 428, 'red'),
('laem_chabang_mountain_valley', 9, 1, 1, 296, 'red');

-- Valley (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('laem_chabang_mountain_valley', 10, 4, 4, 376, 'red'),
('laem_chabang_mountain_valley', 11, 3, 3, 452, 'red'),
('laem_chabang_mountain_valley', 12, 2, 2, 336, 'red'),
('laem_chabang_mountain_valley', 13, 1, 1, 370, 'red'),
('laem_chabang_mountain_valley', 14, 8, 8, 147, 'red'),
('laem_chabang_mountain_valley', 15, 6, 6, 461, 'red'),
('laem_chabang_mountain_valley', 16, 7, 7, 370, 'red'),
('laem_chabang_mountain_valley', 17, 9, 9, 128, 'red'),
('laem_chabang_mountain_valley', 18, 5, 5, 369, 'red');

-- ----------------------------------------------------------------------------
-- MOUNTAIN+VALLEY - YELLOW TEES
-- ----------------------------------------------------------------------------

-- Mountain (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('laem_chabang_mountain_valley', 1, 4, 3, 230, 'yellow'),
('laem_chabang_mountain_valley', 2, 4, 4, 97, 'yellow'),
('laem_chabang_mountain_valley', 3, 6, 6, 342, 'yellow'),
('laem_chabang_mountain_valley', 4, 8, 8, 406, 'yellow'),
('laem_chabang_mountain_valley', 5, 9, 9, 256, 'yellow'),
('laem_chabang_mountain_valley', 6, 2, 2, 267, 'yellow'),
('laem_chabang_mountain_valley', 7, 7, 7, 128, 'yellow'),
('laem_chabang_mountain_valley', 8, 5, 5, 348, 'yellow'),
('laem_chabang_mountain_valley', 9, 1, 1, 245, 'yellow');

-- Valley (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('laem_chabang_mountain_valley', 10, 4, 4, 351, 'yellow'),
('laem_chabang_mountain_valley', 11, 3, 3, 421, 'yellow'),
('laem_chabang_mountain_valley', 12, 2, 2, 302, 'yellow'),
('laem_chabang_mountain_valley', 13, 1, 1, 337, 'yellow'),
('laem_chabang_mountain_valley', 14, 8, 8, 128, 'yellow'),
('laem_chabang_mountain_valley', 15, 6, 6, 434, 'yellow'),
('laem_chabang_mountain_valley', 16, 7, 7, 348, 'yellow'),
('laem_chabang_mountain_valley', 17, 9, 9, 111, 'yellow'),
('laem_chabang_mountain_valley', 18, 5, 5, 276, 'yellow');

-- ============================================================================
-- Step 4: Insert Course 3 - Lake+Valley (18 holes)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- LAKE+VALLEY - BLACK TEES
-- ----------------------------------------------------------------------------

-- Lake (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('laem_chabang_lake_valley', 1, 5, 5, 380, 'black'),
('laem_chabang_lake_valley', 2, 3, 3, 518, 'black'),
('laem_chabang_lake_valley', 3, 2, 2, 422, 'black'),
('laem_chabang_lake_valley', 4, 9, 9, 363, 'black'),
('laem_chabang_lake_valley', 5, 7, 7, 212, 'black'),
('laem_chabang_lake_valley', 6, 1, 1, 441, 'black'),
('laem_chabang_lake_valley', 7, 6, 6, 378, 'black'),
('laem_chabang_lake_valley', 8, 8, 8, 184, 'black'),
('laem_chabang_lake_valley', 9, 4, 4, 521, 'black');

-- Valley (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('laem_chabang_lake_valley', 10, 4, 4, 438, 'black'),
('laem_chabang_lake_valley', 11, 3, 3, 538, 'black'),
('laem_chabang_lake_valley', 12, 2, 2, 420, 'black'),
('laem_chabang_lake_valley', 13, 1, 1, 454, 'black'),
('laem_chabang_lake_valley', 14, 8, 8, 205, 'black'),
('laem_chabang_lake_valley', 15, 6, 6, 550, 'black'),
('laem_chabang_lake_valley', 16, 7, 7, 419, 'black'),
('laem_chabang_lake_valley', 17, 9, 9, 168, 'black'),
('laem_chabang_lake_valley', 18, 5, 5, 427, 'black');

-- ----------------------------------------------------------------------------
-- LAKE+VALLEY - BLUE TEES
-- ----------------------------------------------------------------------------

-- Lake (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('laem_chabang_lake_valley', 1, 5, 5, 361, 'blue'),
('laem_chabang_lake_valley', 2, 3, 3, 505, 'blue'),
('laem_chabang_lake_valley', 3, 2, 2, 407, 'blue'),
('laem_chabang_lake_valley', 4, 9, 9, 348, 'blue'),
('laem_chabang_lake_valley', 5, 7, 7, 191, 'blue'),
('laem_chabang_lake_valley', 6, 1, 1, 428, 'blue'),
('laem_chabang_lake_valley', 7, 6, 6, 354, 'blue'),
('laem_chabang_lake_valley', 8, 8, 8, 165, 'blue'),
('laem_chabang_lake_valley', 9, 4, 4, 506, 'blue');

-- Valley (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('laem_chabang_lake_valley', 10, 4, 4, 420, 'blue'),
('laem_chabang_lake_valley', 11, 3, 3, 515, 'blue'),
('laem_chabang_lake_valley', 12, 2, 2, 397, 'blue'),
('laem_chabang_lake_valley', 13, 1, 1, 424, 'blue'),
('laem_chabang_lake_valley', 14, 8, 8, 195, 'blue'),
('laem_chabang_lake_valley', 15, 6, 6, 520, 'blue'),
('laem_chabang_lake_valley', 16, 7, 7, 414, 'blue'),
('laem_chabang_lake_valley', 17, 9, 9, 156, 'blue'),
('laem_chabang_lake_valley', 18, 5, 5, 415, 'blue');

-- ----------------------------------------------------------------------------
-- LAKE+VALLEY - WHITE TEES
-- ----------------------------------------------------------------------------

-- Lake (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('laem_chabang_lake_valley', 1, 5, 5, 333, 'white'),
('laem_chabang_lake_valley', 2, 3, 3, 488, 'white'),
('laem_chabang_lake_valley', 3, 2, 2, 368, 'white'),
('laem_chabang_lake_valley', 4, 9, 9, 313, 'white'),
('laem_chabang_lake_valley', 5, 7, 7, 167, 'white'),
('laem_chabang_lake_valley', 6, 1, 1, 402, 'white'),
('laem_chabang_lake_valley', 7, 6, 6, 330, 'white'),
('laem_chabang_lake_valley', 8, 8, 8, 143, 'white'),
('laem_chabang_lake_valley', 9, 4, 4, 488, 'white');

-- Valley (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('laem_chabang_lake_valley', 10, 4, 4, 398, 'white'),
('laem_chabang_lake_valley', 11, 3, 3, 482, 'white'),
('laem_chabang_lake_valley', 12, 2, 2, 374, 'white'),
('laem_chabang_lake_valley', 13, 1, 1, 401, 'white'),
('laem_chabang_lake_valley', 14, 8, 8, 180, 'white'),
('laem_chabang_lake_valley', 15, 6, 6, 491, 'white'),
('laem_chabang_lake_valley', 16, 7, 7, 392, 'white'),
('laem_chabang_lake_valley', 17, 9, 9, 143, 'white'),
('laem_chabang_lake_valley', 18, 5, 5, 394, 'white');

-- ----------------------------------------------------------------------------
-- LAKE+VALLEY - RED TEES
-- ----------------------------------------------------------------------------

-- Lake (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('laem_chabang_lake_valley', 1, 5, 5, 293, 'red'),
('laem_chabang_lake_valley', 2, 3, 3, 455, 'red'),
('laem_chabang_lake_valley', 3, 2, 2, 339, 'red'),
('laem_chabang_lake_valley', 4, 9, 9, 249, 'red'),
('laem_chabang_lake_valley', 5, 7, 7, 142, 'red'),
('laem_chabang_lake_valley', 6, 1, 1, 377, 'red'),
('laem_chabang_lake_valley', 7, 6, 6, 264, 'red'),
('laem_chabang_lake_valley', 8, 8, 8, 125, 'red'),
('laem_chabang_lake_valley', 9, 4, 4, 462, 'red');

-- Valley (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('laem_chabang_lake_valley', 10, 4, 4, 376, 'red'),
('laem_chabang_lake_valley', 11, 3, 3, 452, 'red'),
('laem_chabang_lake_valley', 12, 2, 2, 336, 'red'),
('laem_chabang_lake_valley', 13, 1, 1, 370, 'red'),
('laem_chabang_lake_valley', 14, 8, 8, 147, 'red'),
('laem_chabang_lake_valley', 15, 6, 6, 461, 'red'),
('laem_chabang_lake_valley', 16, 7, 7, 370, 'red'),
('laem_chabang_lake_valley', 17, 9, 9, 128, 'red'),
('laem_chabang_lake_valley', 18, 5, 5, 369, 'red');

-- ----------------------------------------------------------------------------
-- LAKE+VALLEY - YELLOW TEES
-- ----------------------------------------------------------------------------

-- Lake (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('laem_chabang_lake_valley', 1, 5, 5, 265, 'yellow'),
('laem_chabang_lake_valley', 2, 3, 3, 431, 'yellow'),
('laem_chabang_lake_valley', 3, 2, 2, 280, 'yellow'),
('laem_chabang_lake_valley', 4, 9, 9, 233, 'yellow'),
('laem_chabang_lake_valley', 5, 7, 7, 118, 'yellow'),
('laem_chabang_lake_valley', 6, 1, 1, 350, 'yellow'),
('laem_chabang_lake_valley', 7, 6, 6, 230, 'yellow'),
('laem_chabang_lake_valley', 8, 8, 8, 102, 'yellow'),
('laem_chabang_lake_valley', 9, 4, 4, 382, 'yellow');

-- Valley (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('laem_chabang_lake_valley', 10, 4, 4, 351, 'yellow'),
('laem_chabang_lake_valley', 11, 3, 3, 421, 'yellow'),
('laem_chabang_lake_valley', 12, 2, 2, 302, 'yellow'),
('laem_chabang_lake_valley', 13, 1, 1, 337, 'yellow'),
('laem_chabang_lake_valley', 14, 8, 8, 128, 'yellow'),
('laem_chabang_lake_valley', 15, 6, 6, 434, 'yellow'),
('laem_chabang_lake_valley', 16, 7, 7, 348, 'yellow'),
('laem_chabang_lake_valley', 17, 9, 9, 111, 'yellow'),
('laem_chabang_lake_valley', 18, 5, 5, 276, 'yellow');

COMMIT;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
-- Laem Chabang International Country Club - 3 Course Combinations
--
-- Course 1: laem_chabang_mountain_lake
--    Mountain (Holes 1-9) + Lake (Holes 10-18)
--    Black: 6,665 yards | Blue: 6,363 yards | White: 5,882 yards
--    Red: 5,478 yards | Yellow: 4,710 yards
--
-- Course 2: laem_chabang_mountain_valley
--    Mountain (Holes 1-9) + Valley (Holes 10-18)
--    Black: 6,865 yards | Blue: 6,554 yards | White: 6,105 yards
--    Red: 5,781 yards | Yellow: 5,027 yards
--
-- Course 3: laem_chabang_lake_valley
--    Lake (Holes 1-9) + Valley (Holes 10-18)
--    Black: 7,038 yards | Blue: 6,721 yards | White: 6,287 yards
--    Red: 5,715 yards | Yellow: 5,099 yards
--
-- Total Records Inserted: 270 (3 courses × 18 holes × 5 tee markers)
-- All holes numbered 1-18 to comply with database constraints
-- ============================================================================
