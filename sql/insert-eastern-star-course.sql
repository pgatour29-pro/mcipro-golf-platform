-- =====================================================================
-- INSERT EASTERN STAR GOLF COURSE DATA
-- =====================================================================
-- This populates the courses and course_holes tables with Eastern Star
-- golf course data including all 4 tees (blue, white, yellow, red)
-- Run this in Supabase SQL Editor
-- =====================================================================

BEGIN;

-- Insert or update the course in courses table
INSERT INTO courses (id, name, scorecard_url, location)
VALUES (
  'eastern_star',
  'Eastern Star Golf Course',
  'https://example.com/scorecards/easternstar.jpg',
  'Thailand'
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    location = EXCLUDED.location;

-- Delete existing hole data if any
DELETE FROM course_holes WHERE course_id = 'eastern_star';

-- Insert hole data for all 4 tees (blue, white, yellow, red)
-- Par: 72 (Front 9 = 36, Back 9 = 36)

-- BLUE TEES
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9
('eastern_star', 1, 4, 2, 415, 'blue'),
('eastern_star', 2, 4, 16, 449, 'blue'),
('eastern_star', 3, 3, 12, 203, 'blue'),
('eastern_star', 4, 5, 6, 577, 'blue'),
('eastern_star', 5, 4, 14, 390, 'blue'),
('eastern_star', 6, 3, 18, 193, 'blue'),
('eastern_star', 7, 4, 10, 421, 'blue'),
('eastern_star', 8, 5, 8, 509, 'blue'),
('eastern_star', 9, 4, 4, 445, 'blue'),
-- Back 9
('eastern_star', 10, 4, 5, 421, 'blue'),
('eastern_star', 11, 5, 7, 596, 'blue'),
('eastern_star', 12, 4, 17, 327, 'blue'),
('eastern_star', 13, 3, 15, 167, 'blue'),
('eastern_star', 14, 4, 3, 417, 'blue'),
('eastern_star', 15, 5, 11, 532, 'blue'),
('eastern_star', 16, 4, 1, 451, 'blue'),
('eastern_star', 17, 3, 13, 206, 'blue'),
('eastern_star', 18, 4, 9, 415, 'blue');

-- WHITE TEES
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9
('eastern_star', 1, 4, 2, 381, 'white'),
('eastern_star', 2, 4, 16, 421, 'white'),
('eastern_star', 3, 3, 12, 175, 'white'),
('eastern_star', 4, 5, 6, 534, 'white'),
('eastern_star', 5, 4, 14, 365, 'white'),
('eastern_star', 6, 3, 18, 166, 'white'),
('eastern_star', 7, 4, 10, 383, 'white'),
('eastern_star', 8, 5, 8, 473, 'white'),
('eastern_star', 9, 4, 4, 419, 'white'),
-- Back 9
('eastern_star', 10, 4, 5, 385, 'white'),
('eastern_star', 11, 5, 7, 561, 'white'),
('eastern_star', 12, 4, 17, 290, 'white'),
('eastern_star', 13, 3, 15, 157, 'white'),
('eastern_star', 14, 4, 3, 389, 'white'),
('eastern_star', 15, 5, 11, 501, 'white'),
('eastern_star', 16, 4, 1, 416, 'white'),
('eastern_star', 17, 3, 13, 172, 'white'),
('eastern_star', 18, 4, 9, 387, 'white');

-- YELLOW TEES
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9
('eastern_star', 1, 4, 2, 349, 'yellow'),
('eastern_star', 2, 4, 16, 384, 'yellow'),
('eastern_star', 3, 3, 12, 147, 'yellow'),
('eastern_star', 4, 5, 6, 502, 'yellow'),
('eastern_star', 5, 4, 14, 333, 'yellow'),
('eastern_star', 6, 3, 18, 154, 'yellow'),
('eastern_star', 7, 4, 10, 375, 'yellow'),
('eastern_star', 8, 5, 8, 441, 'yellow'),
('eastern_star', 9, 4, 4, 386, 'yellow'),
-- Back 9
('eastern_star', 10, 4, 5, 353, 'yellow'),
('eastern_star', 11, 5, 7, 521, 'yellow'),
('eastern_star', 12, 4, 17, 270, 'yellow'),
('eastern_star', 13, 3, 15, 131, 'yellow'),
('eastern_star', 14, 4, 3, 373, 'yellow'),
('eastern_star', 15, 5, 11, 465, 'yellow'),
('eastern_star', 16, 4, 1, 393, 'yellow'),
('eastern_star', 17, 3, 13, 156, 'yellow'),
('eastern_star', 18, 4, 9, 367, 'yellow');

-- RED TEES
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9
('eastern_star', 1, 4, 2, 314, 'red'),
('eastern_star', 2, 4, 16, 344, 'red'),
('eastern_star', 3, 3, 12, 134, 'red'),
('eastern_star', 4, 5, 6, 472, 'red'),
('eastern_star', 5, 4, 14, 296, 'red'),
('eastern_star', 6, 3, 18, 129, 'red'),
('eastern_star', 7, 4, 10, 339, 'red'),
('eastern_star', 8, 5, 8, 410, 'red'),
('eastern_star', 9, 4, 4, 356, 'red'),
-- Back 9
('eastern_star', 10, 4, 5, 331, 'red'),
('eastern_star', 11, 5, 7, 484, 'red'),
('eastern_star', 12, 4, 17, 241, 'red'),
('eastern_star', 13, 3, 15, 106, 'red'),
('eastern_star', 14, 4, 3, 340, 'red'),
('eastern_star', 15, 5, 11, 427, 'red'),
('eastern_star', 16, 4, 1, 366, 'red'),
('eastern_star', 17, 3, 13, 131, 'red'),
('eastern_star', 18, 4, 9, 339, 'red');

COMMIT;

-- =====================================================================
-- VERIFICATION QUERIES
-- =====================================================================

-- Check course was inserted
SELECT id, name, location, scorecard_url
FROM courses
WHERE id = 'eastern_star';

-- Check hole count by tee
SELECT
    tee_marker,
    COUNT(*) as hole_count,
    SUM(par) as total_par,
    SUM(yardage) as total_yardage
FROM course_holes
WHERE course_id = 'eastern_star'
GROUP BY tee_marker
ORDER BY
    CASE tee_marker
        WHEN 'blue' THEN 1
        WHEN 'white' THEN 2
        WHEN 'yellow' THEN 3
        WHEN 'red' THEN 4
    END;

-- View all holes for white tees (most common)
SELECT
    hole_number,
    par,
    stroke_index,
    yardage,
    tee_marker
FROM course_holes
WHERE course_id = 'eastern_star'
  AND tee_marker = 'white'
ORDER BY hole_number;

-- =====================================================================
-- SUCCESS MESSAGE
-- =====================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'EASTERN STAR GOLF COURSE - SUCCESSFULLY ADDED';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'COURSE DETAILS:';
  RAISE NOTICE '  Name: Eastern Star Golf Course';
  RAISE NOTICE '  ID: eastern_star';
  RAISE NOTICE '  Total Holes: 18 (Par 72)';
  RAISE NOTICE '  Available Tees: 4 (blue, white, yellow, red)';
  RAISE NOTICE '';
  RAISE NOTICE 'YARDAGES BY TEE:';
  RAISE NOTICE '  Blue:   7134 yards (Rating: TBD, Slope: TBD)';
  RAISE NOTICE '  White:  6575 yards (Rating: TBD, Slope: TBD)';
  RAISE NOTICE '  Yellow: 6100 yards (Rating: TBD, Slope: TBD)';
  RAISE NOTICE '  Red:    5559 yards (Rating: TBD, Slope: TBD)';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '  1. Eastern Star will now appear in course selection dropdowns';
  RAISE NOTICE '  2. Players can create rounds at Eastern Star';
  RAISE NOTICE '  3. All 4 tee markers available for selection';
  RAISE NOTICE '  4. Upload scorecard image if available';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;
