-- =====================================================
-- Burapha Golf Club - West Course (All Tee Markers)
-- Complete data extraction from scorecard
-- =====================================================

-- Delete existing data for Burapha West Course
DELETE FROM course_holes WHERE course_id = 'burapha_west';

-- =====================================================
-- BLACK TEES (Championship)
-- Front 9: 3705 yards | Back 9: 3628 yards | Total: 7333 yards
-- =====================================================

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

-- =====================================================
-- BLUE TEES (Men's Championship)
-- Front 9: 3254 yards | Back 9: 3387 yards | Total: 6641 yards
-- =====================================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, tee_marker, yardage) VALUES
('burapha_west', 1, 4, 4, 'blue', 431),
('burapha_west', 2, 5, 8, 'blue', 516),
('burapha_west', 3, 4, 2, 'blue', 438),
('burapha_west', 4, 4, 14, 'blue', 328),
('burapha_west', 5, 3, 18, 'blue', 132),
('burapha_west', 6, 4, 12, 'blue', 360),
('burapha_west', 7, 5, 10, 'blue', 499),
('burapha_west', 8, 3, 16, 'blue', 177),
('burapha_west', 9, 4, 6, 'blue', 373),
('burapha_west', 10, 5, 13, 'blue', 495),
('burapha_west', 11, 3, 11, 'blue', 169),
('burapha_west', 12, 4, 7, 'blue', 418),
('burapha_west', 13, 4, 3, 'blue', 423),
('burapha_west', 14, 5, 9, 'blue', 513),
('burapha_west', 15, 4, 5, 'blue', 403),
('burapha_west', 16, 4, 17, 'blue', 275),
('burapha_west', 17, 3, 15, 'blue', 204),
('burapha_west', 18, 4, 1, 'blue', 490);

-- =====================================================
-- WHITE TEES (Men's Regular)
-- Front 9: 3060 yards | Back 9: 3149 yards | Total: 6209 yards
-- =====================================================

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
-- RED TEES (Ladies)
-- Front 9: 2656 yards | Back 9: 2835 yards | Total: 5491 yards
-- =====================================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, tee_marker, yardage) VALUES
('burapha_west', 1, 4, 4, 'red', 355),
('burapha_west', 2, 5, 8, 'red', 447),
('burapha_west', 3, 4, 2, 'red', 365),
('burapha_west', 4, 4, 14, 'red', 234),
('burapha_west', 5, 3, 18, 'red', 100),
('burapha_west', 6, 4, 12, 'red', 275),
('burapha_west', 7, 5, 10, 'red', 457),
('burapha_west', 8, 3, 16, 'red', 116),
('burapha_west', 9, 4, 6, 'red', 307),
('burapha_west', 10, 5, 13, 'red', 438),
('burapha_west', 11, 3, 11, 'red', 114),
('burapha_west', 12, 4, 7, 'red', 346),
('burapha_west', 13, 4, 3, 'red', 358),
('burapha_west', 14, 5, 9, 'red', 449),
('burapha_west', 15, 4, 5, 'red', 317),
('burapha_west', 16, 4, 17, 'red', 210),
('burapha_west', 17, 3, 15, 'red', 158),
('burapha_west', 18, 4, 1, 'red', 445);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify total yardages by tee color
SELECT
    tee_marker,
    SUM(CASE WHEN hole_number <= 9 THEN yardage ELSE 0 END) as front_9,
    SUM(CASE WHEN hole_number > 9 THEN yardage ELSE 0 END) as back_9,
    SUM(yardage) as total_yardage,
    SUM(par) as total_par
FROM course_holes
WHERE course_id = 'burapha_west'
GROUP BY tee_marker
ORDER BY total_yardage DESC;

-- Verify hole count by tee color
SELECT
    tee_marker,
    COUNT(*) as hole_count
FROM course_holes
WHERE course_id = 'burapha_west'
GROUP BY tee_marker;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
-- Burapha West Course - All Tee Markers Loaded Successfully
--
-- BLACK TEES:  7333 yards (3705 out + 3628 in) Par 72
-- BLUE TEES:   6641 yards (3254 out + 3387 in) Par 72
-- WHITE TEES:  6209 yards (3060 out + 3149 in) Par 72
-- RED TEES:    5491 yards (2656 out + 2835 in) Par 72
--
-- Total: 72 holes (4 tee markers x 18 holes)
-- =====================================================
