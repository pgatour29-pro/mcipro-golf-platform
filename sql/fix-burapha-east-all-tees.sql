-- =====================================================
-- FIX BURAPHA GOLF CLUB - EAST COURSE - ALL TEE MARKERS
-- =====================================================
-- This script adds COMPLETE tee data for Burapha East Course
-- Includes: Championship, Ladies, Men, Women tees

-- Delete existing incorrect data
DELETE FROM course_holes WHERE course_id = 'burapha_east';

-- =====================================================
-- CHAMPIONSHIP TEES (Black/Gold)
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9 (A1-A9)
('burapha_east', 1, 4, 14, 358, 'championship'),
('burapha_east', 2, 4, 6, 414, 'championship'),
('burapha_east', 3, 3, 18, 170, 'championship'),
('burapha_east', 4, 4, 8, 416, 'championship'),
('burapha_east', 5, 5, 12, 581, 'championship'),
('burapha_east', 6, 3, 16, 196, 'championship'),
('burapha_east', 7, 5, 10, 554, 'championship'),
('burapha_east', 8, 4, 4, 452, 'championship'),
('burapha_east', 9, 4, 2, 468, 'championship'),
-- Back 9 (B1-B9)
('burapha_east', 10, 4, 3, 480, 'championship'),
('burapha_east', 11, 4, 13, 346, 'championship'),
('burapha_east', 12, 3, 17, 193, 'championship'),
('burapha_east', 13, 4, 9, 407, 'championship'),
('burapha_east', 14, 4, 5, 420, 'championship'),
('burapha_east', 15, 5, 11, 572, 'championship'),
('burapha_east', 16, 4, 1, 446, 'championship'),
('burapha_east', 17, 3, 15, 196, 'championship'),
('burapha_east', 18, 5, 7, 512, 'championship');

-- =====================================================
-- LADIES TEES
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9 (A1-A9)
('burapha_east', 1, 4, 14, 323, 'ladies'),
('burapha_east', 2, 4, 6, 389, 'ladies'),
('burapha_east', 3, 3, 18, 109, 'ladies'),
('burapha_east', 4, 4, 8, 385, 'ladies'),
('burapha_east', 5, 5, 12, 548, 'ladies'),
('burapha_east', 6, 3, 16, 179, 'ladies'),
('burapha_east', 7, 5, 10, 526, 'ladies'),
('burapha_east', 8, 4, 4, 442, 'ladies'),
('burapha_east', 9, 4, 2, 454, 'ladies'),
-- Back 9 (B1-B9)
('burapha_east', 10, 4, 3, 448, 'ladies'),
('burapha_east', 11, 4, 13, 318, 'ladies'),
('burapha_east', 12, 3, 17, 160, 'ladies'),
('burapha_east', 13, 4, 9, 374, 'ladies'),
('burapha_east', 14, 4, 5, 404, 'ladies'),
('burapha_east', 15, 5, 11, 540, 'ladies'),
('burapha_east', 16, 4, 1, 419, 'ladies'),
('burapha_east', 17, 3, 15, 176, 'ladies'),
('burapha_east', 18, 5, 7, 512, 'ladies');

-- =====================================================
-- MEN TEES (Regular)
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9 (A1-A9)
('burapha_east', 1, 4, 14, 297, 'men'),
('burapha_east', 2, 4, 6, 363, 'men'),
('burapha_east', 3, 3, 18, 132, 'men'),
('burapha_east', 4, 4, 8, 356, 'men'),
('burapha_east', 5, 5, 12, 513, 'men'),
('burapha_east', 6, 3, 16, 172, 'men'),
('burapha_east', 7, 5, 10, 501, 'men'),
('burapha_east', 8, 4, 4, 399, 'men'),
('burapha_east', 9, 4, 2, 439, 'men'),
-- Back 9 (B1-B9)
('burapha_east', 10, 4, 3, 423, 'men'),
('burapha_east', 11, 4, 13, 282, 'men'),
('burapha_east', 12, 3, 17, 133, 'men'),
('burapha_east', 13, 4, 9, 347, 'men'),
('burapha_east', 14, 4, 5, 419, 'men'),
('burapha_east', 15, 5, 11, 504, 'men'),
('burapha_east', 16, 4, 1, 398, 'men'),
('burapha_east', 17, 3, 15, 158, 'men'),
('burapha_east', 18, 5, 7, 490, 'men');

-- =====================================================
-- WOMEN TEES
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9 (A1-A9)
('burapha_east', 1, 4, 14, 273, 'women'),
('burapha_east', 2, 4, 6, 334, 'women'),
('burapha_east', 3, 3, 18, 95, 'women'),
('burapha_east', 4, 4, 8, 333, 'women'),
('burapha_east', 5, 5, 12, 481, 'women'),
('burapha_east', 6, 3, 16, 136, 'women'),
('burapha_east', 7, 5, 10, 430, 'women'),
('burapha_east', 8, 4, 4, 365, 'women'),
('burapha_east', 9, 4, 2, 385, 'women'),
-- Back 9 (B1-B9)
('burapha_east', 10, 4, 3, 353, 'women'),
('burapha_east', 11, 4, 13, 253, 'women'),
('burapha_east', 12, 3, 17, 107, 'women'),
('burapha_east', 13, 4, 9, 304, 'women'),
('burapha_east', 14, 4, 5, 368, 'women'),
('burapha_east', 15, 5, 11, 442, 'women'),
('burapha_east', 16, 4, 1, 353, 'women'),
('burapha_east', 17, 3, 15, 143, 'women'),
('burapha_east', 18, 5, 7, 421, 'women');

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check all tee markers are present
SELECT tee_marker, COUNT(*) as hole_count
FROM course_holes
WHERE course_id = 'burapha_east'
GROUP BY tee_marker
ORDER BY tee_marker;

-- Verify yardages match scorecard
SELECT
    tee_marker,
    SUM(CASE WHEN hole_number <= 9 THEN yardage ELSE 0 END) as out,
    SUM(CASE WHEN hole_number > 9 THEN yardage ELSE 0 END) as in,
    SUM(yardage) as total
FROM course_holes
WHERE course_id = 'burapha_east'
GROUP BY tee_marker
ORDER BY tee_marker;

-- Expected results (from scorecard):
-- Championship: OUT 3611 + IN 3663 = TOTAL 7274 (approx)
-- Ladies:       OUT 3402 + IN 3376 = TOTAL 6778 (approx)
-- Men:          OUT 3174 + IN 3490 = TOTAL 6664 (approx)
-- Women:        OUT 2696 + IN 2736 = TOTAL 5432 (approx)

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Burapha Golf Club - East Course - ALL TEE MARKERS added!';
    RAISE NOTICE '⚫ Championship Tees: ~7,274 yards';
    RAISE NOTICE '💗 Ladies Tees: ~6,778 yards';
    RAISE NOTICE '🔵 Men Tees: ~6,664 yards';
    RAISE NOTICE '🔴 Women Tees: ~5,432 yards';
    RAISE NOTICE 'Total: 72 holes (18 holes × 4 tee markers)';
END $$;
