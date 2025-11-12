-- =====================================================
-- INSERT GREENWOOD GOLF & RESORT COURSE DATA
-- =====================================================
-- This script adds Greenwood Golf & Resort to the database
-- with hole-by-hole data
-- =====================================================
-- IMPORTANT: This is a TEMPLATE - Replace with actual scorecard data!
-- =====================================================

-- First, ensure the course exists in courses table
INSERT INTO courses (id, name, scorecard_url, location, country, created_at)
VALUES (
  'greenwood',
  'Greenwood Golf & Resort',
  '/public/assets/scorecards/greenwood.jpg',
  'Pattaya, Chonburi',
  'Thailand',
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    scorecard_url = EXCLUDED.scorecard_url,
    updated_at = NOW();

-- Clean up any existing hole data
DELETE FROM course_holes WHERE course_id = 'greenwood';

-- Insert hole data for Greenwood Golf & Resort
-- =====================================================
-- TODO: Replace this template data with actual scorecard values
-- =====================================================
-- Par: ?,?,?,?,?,?,?,?,? (Front 9 = ?)
--      ?,?,?,?,?,?,?,?,? (Back 9 = ?)
-- Total Par: ?
-- =====================================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker)
VALUES
-- =====================================================
-- FRONT 9 HOLES (1-9)
-- =====================================================
-- TODO: Update these values from the actual Greenwood scorecard
('greenwood', 1, 4, 11, 380, 'white'),  -- Update: par, stroke index, yardage
('greenwood', 2, 5, 3, 520, 'white'),   -- Update: par, stroke index, yardage
('greenwood', 3, 3, 17, 165, 'white'),  -- Update: par, stroke index, yardage
('greenwood', 4, 4, 7, 390, 'white'),   -- Update: par, stroke index, yardage
('greenwood', 5, 4, 13, 370, 'white'),  -- Update: par, stroke index, yardage
('greenwood', 6, 4, 5, 400, 'white'),   -- Update: par, stroke index, yardage
('greenwood', 7, 3, 15, 170, 'white'),  -- Update: par, stroke index, yardage
('greenwood', 8, 5, 1, 530, 'white'),   -- Update: par, stroke index, yardage
('greenwood', 9, 4, 9, 385, 'white'),   -- Update: par, stroke index, yardage

-- =====================================================
-- BACK 9 HOLES (10-18)
-- =====================================================
-- TODO: Update these values from the actual Greenwood scorecard
('greenwood', 10, 4, 10, 375, 'white'), -- Update: par, stroke index, yardage
('greenwood', 11, 4, 14, 360, 'white'), -- Update: par, stroke index, yardage
('greenwood', 12, 3, 18, 160, 'white'), -- Update: par, stroke index, yardage
('greenwood', 13, 5, 2, 525, 'white'),  -- Update: par, stroke index, yardage
('greenwood', 14, 4, 8, 390, 'white'),  -- Update: par, stroke index, yardage
('greenwood', 15, 4, 12, 365, 'white'), -- Update: par, stroke index, yardage
('greenwood', 16, 3, 16, 175, 'white'), -- Update: par, stroke index, yardage
('greenwood', 17, 5, 4, 515, 'white'),  -- Update: par, stroke index, yardage
('greenwood', 18, 4, 6, 400, 'white');  -- Update: par, stroke index, yardage

-- =====================================================
-- OPTIONAL: Add additional tee markers (Blue, Red, etc.)
-- =====================================================
-- Uncomment and update if you have multiple tee data

/*
-- Blue Tees (Championship)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker)
VALUES
('greenwood', 1, 4, 11, 420, 'blue'),
('greenwood', 2, 5, 3, 560, 'blue'),
-- ... continue for all 18 holes
('greenwood', 18, 4, 6, 440, 'blue');

-- Red Tees (Ladies)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker)
VALUES
('greenwood', 1, 4, 11, 320, 'red'),
('greenwood', 2, 5, 3, 450, 'red'),
-- ... continue for all 18 holes
('greenwood', 18, 4, 6, 340, 'red');
*/

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify the course was inserted
SELECT id, name, scorecard_url, location
FROM courses
WHERE id = 'greenwood';

-- Verify all 18 holes were inserted
SELECT
    hole_number,
    par,
    stroke_index,
    yardage,
    tee_marker
FROM course_holes
WHERE course_id = 'greenwood'
ORDER BY hole_number;

-- Check par totals
SELECT
    'Front 9' as nine,
    SUM(CASE WHEN hole_number <= 9 THEN par ELSE 0 END) as par,
    SUM(CASE WHEN hole_number <= 9 THEN yardage ELSE 0 END) as yardage
FROM course_holes
WHERE course_id = 'greenwood'
UNION ALL
SELECT
    'Back 9',
    SUM(CASE WHEN hole_number > 9 THEN par ELSE 0 END),
    SUM(CASE WHEN hole_number > 9 THEN yardage ELSE 0 END)
FROM course_holes
WHERE course_id = 'greenwood'
UNION ALL
SELECT
    'Total',
    SUM(par),
    SUM(yardage)
FROM course_holes
WHERE course_id = 'greenwood';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Greenwood Golf & Resort has been added!';
    RAISE NOTICE '⚠️  IMPORTANT: Update the hole data with actual scorecard values';
    RAISE NOTICE '📸 Scorecard image path: /public/assets/scorecards/greenwood.jpg';
END $$;

-- =====================================================
-- NOTES FOR COMPLETION
-- =====================================================
-- 1. Get the actual Greenwood Golf & Resort scorecard
-- 2. Update each hole's par, stroke index, and yardage values
-- 3. Add additional tee markers if available (blue, red, yellow)
-- 4. Upload scorecard image to: public/assets/scorecards/greenwood.jpg
-- 5. Run verification queries to ensure data is correct
-- =====================================================
