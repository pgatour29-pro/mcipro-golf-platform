-- =====================================================
-- FIX PATTAVIA GOLF CLUB - CORRECT SCORECARD DATA
-- =====================================================
-- This script corrects the Pattavia course data based on
-- the actual scorecard image (Pattavia-scorecard.jpg)

-- Delete existing incorrect data
DELETE FROM course_holes WHERE course_id = 'pattavia';

-- Insert correct hole data from actual scorecard
-- Front 9
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
-- Back 9
('pattavia', 10, 4, 16, 389, 'white'),
('pattavia', 11, 4, 10, 333, 'white'),
('pattavia', 12, 5, 4, 533, 'white'),
('pattavia', 13, 3, 18, 139, 'white'),
('pattavia', 14, 4, 12, 376, 'white'),
('pattavia', 15, 4, 14, 358, 'white'),
('pattavia', 16, 4, 2, 438, 'white'),
('pattavia', 17, 3, 6, 203, 'white'),
('pattavia', 18, 5, 8, 492, 'white');

-- Verify the data
SELECT
    hole_number,
    par,
    stroke_index as si,
    yardage,
    tee_marker
FROM course_holes
WHERE course_id = 'pattavia'
ORDER BY hole_number;

-- Verify par totals
SELECT
    SUM(CASE WHEN hole_number <= 9 THEN par ELSE 0 END) as front_9_par,
    SUM(CASE WHEN hole_number > 9 THEN par ELSE 0 END) as back_9_par,
    SUM(par) as total_par,
    SUM(CASE WHEN hole_number <= 9 THEN yardage ELSE 0 END) as front_9_yards,
    SUM(CASE WHEN hole_number > 9 THEN yardage ELSE 0 END) as back_9_yards,
    SUM(yardage) as total_yards
FROM course_holes
WHERE course_id = 'pattavia';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Pattavia Golf Club data corrected!';
    RAISE NOTICE 'Total Par: 72 (36 out + 36 in)';
    RAISE NOTICE 'Total Yardage (White): 6,639 yards';
    RAISE NOTICE 'Data source: Pattavia-scorecard.jpg';
END $$;
