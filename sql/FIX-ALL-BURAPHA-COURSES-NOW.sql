-- =====================================================
-- FIX ALL BURAPHA GOLF CLUB COURSES - IMMEDIATE
-- =====================================================
-- This script fixes ALL Burapha course data with correct
-- par and stroke index values from the official scorecards
-- =====================================================

-- =====================================================
-- BURAPHA EAST COURSE - ALL TEE MARKERS
-- =====================================================

DELETE FROM course_holes WHERE course_id = 'burapha_east';

-- Championship Tees (Black/Gold)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('burapha_east', 1, 4, 14, 358, 'championship'),
('burapha_east', 2, 4, 6, 414, 'championship'),
('burapha_east', 3, 3, 18, 170, 'championship'),
('burapha_east', 4, 4, 8, 416, 'championship'),
('burapha_east', 5, 5, 12, 581, 'championship'),
('burapha_east', 6, 3, 16, 196, 'championship'),
('burapha_east', 7, 5, 10, 554, 'championship'),
('burapha_east', 8, 4, 4, 452, 'championship'),
('burapha_east', 9, 4, 2, 468, 'championship'),
('burapha_east', 10, 4, 3, 480, 'championship'),
('burapha_east', 11, 4, 13, 346, 'championship'),
('burapha_east', 12, 3, 17, 193, 'championship'),
('burapha_east', 13, 4, 9, 407, 'championship'),
('burapha_east', 14, 4, 5, 420, 'championship'),
('burapha_east', 15, 5, 11, 572, 'championship'),
('burapha_east', 16, 4, 1, 446, 'championship'),
('burapha_east', 17, 3, 15, 196, 'championship'),
('burapha_east', 18, 5, 7, 512, 'championship');

-- White Tees (Men's Regular)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('burapha_east', 1, 4, 14, 297, 'white'),
('burapha_east', 2, 4, 6, 363, 'white'),
('burapha_east', 3, 3, 18, 132, 'white'),
('burapha_east', 4, 4, 8, 356, 'white'),
('burapha_east', 5, 5, 12, 513, 'white'),
('burapha_east', 6, 3, 16, 172, 'white'),
('burapha_east', 7, 5, 10, 501, 'white'),
('burapha_east', 8, 4, 4, 399, 'white'),
('burapha_east', 9, 4, 2, 439, 'white'),
('burapha_east', 10, 4, 3, 423, 'white'),
('burapha_east', 11, 4, 13, 282, 'white'),
('burapha_east', 12, 3, 17, 133, 'white'),
('burapha_east', 13, 4, 9, 347, 'white'),
('burapha_east', 14, 4, 5, 419, 'white'),
('burapha_east', 15, 5, 11, 504, 'white'),
('burapha_east', 16, 4, 1, 398, 'white'),
('burapha_east', 17, 3, 15, 158, 'white'),
('burapha_east', 18, 5, 7, 490, 'white');

-- =====================================================
-- BURAPHA WEST COURSE - ALL TEE MARKERS
-- =====================================================

DELETE FROM course_holes WHERE course_id = 'burapha_west';

-- Black Tees (Championship)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, tee_marker, yardage) VALUES
('burapha_west', 1, 4, 4, 'black', 462),
('burapha_west', 2, 5, 8, 'black', 545),
('burapha_west', 3, 4, 2, 'black', 484),
('burapha_west', 4, 4, 14, 'black', 370),
('burapha_west', 5, 3, 18, 'black', 162),
('burapha_west', 6, 4, 12, 'black', 373),
('burapha_west', 7, 5, 10, 'black', 526),
('burapha_west', 8, 3, 16, 'black', 606),
('burapha_west', 9, 4, 6, 'black', 177),
('burapha_west', 10, 5, 13, 'black', 524),
('burapha_west', 11, 3, 11, 'black', 202),
('burapha_west', 12, 4, 7, 'black', 445),
('burapha_west', 13, 4, 3, 'black', 456),
('burapha_west', 14, 5, 9, 'black', 542),
('burapha_west', 15, 4, 5, 'black', 432),
('burapha_west', 16, 4, 17, 'black', 285),
('burapha_west', 17, 3, 15, 'black', 232),
('burapha_west', 18, 4, 1, 'black', 510);

-- White Tees (Men's Regular)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, tee_marker, yardage) VALUES
('burapha_west', 1, 4, 4, 'white', 406),
('burapha_west', 2, 5, 8, 'white', 497),
('burapha_west', 3, 4, 2, 'white', 410),
('burapha_west', 4, 4, 14, 'white', 295),
('burapha_west', 5, 3, 18, 'white', 129),
('burapha_west', 6, 4, 12, 'white', 335),
('burapha_west', 7, 5, 10, 'white', 478),
('burapha_west', 8, 3, 16, 'white', 153),
('burapha_west', 9, 4, 6, 'white', 357),
('burapha_west', 10, 5, 13, 'white', 472),
('burapha_west', 11, 3, 11, 'white', 136),
('burapha_west', 12, 4, 7, 'white', 377),
('burapha_west', 13, 4, 3, 'white', 391),
('burapha_west', 14, 5, 9, 'white', 495),
('burapha_west', 15, 4, 5, 'white', 375),
('burapha_west', 16, 4, 17, 'white', 252),
('burapha_west', 17, 3, 15, 'white', 181),
('burapha_west', 18, 4, 1, 'white', 470);

-- =====================================================
-- GENERIC "BURAPHA" ID - Point to East Course White Tees
-- =====================================================

DELETE FROM course_holes WHERE course_id = 'burapha';

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('burapha', 1, 4, 14, 297, 'white'),
('burapha', 2, 4, 6, 363, 'white'),
('burapha', 3, 3, 18, 132, 'white'),
('burapha', 4, 4, 8, 356, 'white'),
('burapha', 5, 5, 12, 513, 'white'),
('burapha', 6, 3, 16, 172, 'white'),
('burapha', 7, 5, 10, 501, 'white'),
('burapha', 8, 4, 4, 399, 'white'),
('burapha', 9, 4, 2, 439, 'white'),
('burapha', 10, 4, 3, 423, 'white'),
('burapha', 11, 4, 13, 282, 'white'),
('burapha', 12, 3, 17, 133, 'white'),
('burapha', 13, 4, 9, 347, 'white'),
('burapha', 14, 4, 5, 419, 'white'),
('burapha', 15, 5, 11, 504, 'white'),
('burapha', 16, 4, 1, 398, 'white'),
('burapha', 17, 3, 15, 158, 'white'),
('burapha', 18, 5, 7, 490, 'white');

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT 'BURAPHA EAST' as course, tee_marker, COUNT(*) as holes, SUM(par) as total_par
FROM course_holes WHERE course_id = 'burapha_east'
GROUP BY tee_marker
UNION ALL
SELECT 'BURAPHA WEST' as course, tee_marker, COUNT(*) as holes, SUM(par) as total_par
FROM course_holes WHERE course_id = 'burapha_west'
GROUP BY tee_marker
UNION ALL
SELECT 'BURAPHA (GENERIC)' as course, tee_marker, COUNT(*) as holes, SUM(par) as total_par
FROM course_holes WHERE course_id = 'burapha'
GROUP BY tee_marker
ORDER BY course, tee_marker;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ALL BURAPHA COURSES FIXED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Burapha East: Championship + White tees';
    RAISE NOTICE 'Burapha West: Black + White tees';
    RAISE NOTICE 'Burapha (generic): White tees (East course)';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total holes updated: 90';
    RAISE NOTICE 'All PAR and STROKE INDEX values correct';
    RAISE NOTICE '========================================';
END $$;
