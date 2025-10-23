-- =====================================================================
-- INSERT ROYAL LAKESIDE GOLF CLUB COURSE DATA
-- =====================================================================
-- This populates the courses and course_holes tables with Royal Lakeside
-- golf course data including all 4 tees (black, blue, white, orange)
-- Run this in Supabase SQL Editor
-- =====================================================================

BEGIN;

-- Insert or update the course in courses table
INSERT INTO courses (id, name, scorecard_url, location)
VALUES (
  'royal_lakeside',
  'Royal Lakeside Golf Club',
  'https://example.com/scorecards/royal_lakeside.jpg',
  'Thailand'
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    location = EXCLUDED.location;

-- Delete existing hole data if any
DELETE FROM course_holes WHERE course_id = 'royal_lakeside';

-- Insert hole data for all 4 tees (black, blue, white, orange)
-- Par: 71 (Front 9 = 36, Back 9 = 35)

-- BLACK TEES
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9
('royal_lakeside', 1, 5, 7, 522, 'black'),
('royal_lakeside', 2, 4, 3, 383, 'black'),
('royal_lakeside', 3, 3, 17, 185, 'black'),
('royal_lakeside', 4, 4, 13, 404, 'black'),
('royal_lakeside', 5, 4, 5, 424, 'black'),
('royal_lakeside', 6, 3, 15, 205, 'black'),
('royal_lakeside', 7, 5, 9, 543, 'black'),
('royal_lakeside', 8, 4, 1, 428, 'black'),
('royal_lakeside', 9, 4, 11, 413, 'black'),
-- Back 9
('royal_lakeside', 10, 5, 12, 544, 'black'),
('royal_lakeside', 11, 4, 8, 367, 'black'),
('royal_lakeside', 12, 3, 16, 200, 'black'),
('royal_lakeside', 13, 4, 6, 433, 'black'),
('royal_lakeside', 14, 4, 4, 419, 'black'),
('royal_lakeside', 15, 3, 18, 177, 'black'),
('royal_lakeside', 16, 4, 2, 393, 'black'),
('royal_lakeside', 17, 4, 14, 380, 'black'),
('royal_lakeside', 18, 5, 10, 563, 'black');

-- BLUE TEES
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9
('royal_lakeside', 1, 5, 7, 501, 'blue'),
('royal_lakeside', 2, 4, 3, 359, 'blue'),
('royal_lakeside', 3, 3, 17, 167, 'blue'),
('royal_lakeside', 4, 4, 13, 377, 'blue'),
('royal_lakeside', 5, 4, 5, 372, 'blue'),
('royal_lakeside', 6, 3, 15, 176, 'blue'),
('royal_lakeside', 7, 5, 9, 531, 'blue'),
('royal_lakeside', 8, 4, 1, 414, 'blue'),
('royal_lakeside', 9, 4, 11, 401, 'blue'),
-- Back 9
('royal_lakeside', 10, 5, 12, 532, 'blue'),
('royal_lakeside', 11, 4, 8, 340, 'blue'),
('royal_lakeside', 12, 3, 16, 195, 'blue'),
('royal_lakeside', 13, 4, 6, 434, 'blue'),
('royal_lakeside', 14, 4, 4, 402, 'blue'),
('royal_lakeside', 15, 3, 18, 162, 'blue'),
('royal_lakeside', 16, 4, 2, 378, 'blue'),
('royal_lakeside', 17, 4, 14, 362, 'blue'),
('royal_lakeside', 18, 5, 10, 550, 'blue');

-- WHITE TEES
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9
('royal_lakeside', 1, 5, 7, 490, 'white'),
('royal_lakeside', 2, 4, 3, 331, 'white'),
('royal_lakeside', 3, 3, 17, 144, 'white'),
('royal_lakeside', 4, 4, 13, 365, 'white'),
('royal_lakeside', 5, 4, 5, 353, 'white'),
('royal_lakeside', 6, 3, 15, 154, 'white'),
('royal_lakeside', 7, 5, 9, 508, 'white'),
('royal_lakeside', 8, 4, 1, 389, 'white'),
('royal_lakeside', 9, 4, 11, 376, 'white'),
-- Back 9
('royal_lakeside', 10, 5, 12, 497, 'white'),
('royal_lakeside', 11, 4, 8, 311, 'white'),
('royal_lakeside', 12, 3, 16, 163, 'white'),
('royal_lakeside', 13, 4, 6, 420, 'white'),
('royal_lakeside', 14, 4, 4, 375, 'white'),
('royal_lakeside', 15, 3, 18, 152, 'white'),
('royal_lakeside', 16, 4, 2, 356, 'white'),
('royal_lakeside', 17, 4, 14, 350, 'white'),
('royal_lakeside', 18, 5, 10, 522, 'white');

-- ORANGE TEES
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9
('royal_lakeside', 1, 5, 7, 420, 'orange'),
('royal_lakeside', 2, 4, 3, 308, 'orange'),
('royal_lakeside', 3, 3, 17, 136, 'orange'),
('royal_lakeside', 4, 4, 13, 318, 'orange'),
('royal_lakeside', 5, 4, 5, 316, 'orange'),
('royal_lakeside', 6, 3, 15, 131, 'orange'),
('royal_lakeside', 7, 5, 9, 477, 'orange'),
('royal_lakeside', 8, 4, 1, 368, 'orange'),
('royal_lakeside', 9, 4, 11, 327, 'orange'),
-- Back 9
('royal_lakeside', 10, 5, 12, 460, 'orange'),
('royal_lakeside', 11, 4, 8, 277, 'orange'),
('royal_lakeside', 12, 3, 16, 128, 'orange'),
('royal_lakeside', 13, 4, 6, 352, 'orange'),
('royal_lakeside', 14, 4, 4, 324, 'orange'),
('royal_lakeside', 15, 3, 18, 134, 'orange'),
('royal_lakeside', 16, 4, 2, 325, 'orange'),
('royal_lakeside', 17, 4, 14, 291, 'orange'),
('royal_lakeside', 18, 5, 10, 486, 'orange');

COMMIT;

-- =====================================================================
-- VERIFICATION QUERIES
-- =====================================================================

-- Check course was inserted
SELECT id, name, location, scorecard_url
FROM courses
WHERE id = 'royal_lakeside';

-- Check hole count by tee
SELECT
    tee_marker,
    COUNT(*) as hole_count,
    SUM(par) as total_par,
    SUM(yardage) as total_yardage
FROM course_holes
WHERE course_id = 'royal_lakeside'
GROUP BY tee_marker
ORDER BY
    CASE tee_marker
        WHEN 'black' THEN 1
        WHEN 'blue' THEN 2
        WHEN 'white' THEN 3
        WHEN 'orange' THEN 4
    END;

-- View all holes for white tees (most common)
SELECT
    hole_number,
    par,
    stroke_index,
    yardage,
    tee_marker
FROM course_holes
WHERE course_id = 'royal_lakeside'
  AND tee_marker = 'white'
ORDER BY hole_number;

-- =====================================================================
-- SUCCESS MESSAGE
-- =====================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'ROYAL LAKESIDE GOLF CLUB - SUCCESSFULLY ADDED';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'COURSE DETAILS:';
  RAISE NOTICE '  Name: Royal Lakeside Golf Club';
  RAISE NOTICE '  ID: royal_lakeside';
  RAISE NOTICE '  Total Holes: 18 (Par 71)';
  RAISE NOTICE '  Available Tees: 4 (black, blue, white, orange)';
  RAISE NOTICE '';
  RAISE NOTICE 'YARDAGES BY TEE:';
  RAISE NOTICE '  Black:  7003 yards (Rating: TBD, Slope: TBD)';
  RAISE NOTICE '  Blue:   6653 yards (Rating: TBD, Slope: TBD)';
  RAISE NOTICE '  White:  6256 yards (Rating: TBD, Slope: TBD)';
  RAISE NOTICE '  Orange: 5578 yards (Rating: TBD, Slope: TBD)';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '  1. Royal Lakeside will appear in course selection dropdown';
  RAISE NOTICE '  2. Players can create rounds at Royal Lakeside';
  RAISE NOTICE '  3. All 4 tee markers available for selection';
  RAISE NOTICE '  4. Upload scorecard image if available';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;
