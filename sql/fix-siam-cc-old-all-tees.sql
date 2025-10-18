-- =====================================================
-- Siam Country Club - Old Course - ALL Tee Markers
-- Complete data extraction from scorecard
-- =====================================================

-- Delete existing data for this course
DELETE FROM course_holes WHERE course_id = 'siam_cc_old';

-- =====================================================
-- BLACK TEES - 7162 yards
-- =====================================================
INSERT INTO course_holes (course_id, tee_marker, hole_number, par, stroke_index, yardage) VALUES
('siam_cc_old', 'black', 1, 5, 14, 543),
('siam_cc_old', 'black', 2, 4, 18, 373),
('siam_cc_old', 'black', 3, 4, 2, 449),
('siam_cc_old', 'black', 4, 3, 16, 189),
('siam_cc_old', 'black', 5, 4, 10, 402),
('siam_cc_old', 'black', 6, 4, 6, 423),
('siam_cc_old', 'black', 7, 5, 8, 557),
('siam_cc_old', 'black', 8, 3, 12, 220),
('siam_cc_old', 'black', 9, 4, 4, 422),
('siam_cc_old', 'black', 10, 5, 13, 578),
('siam_cc_old', 'black', 11, 4, 1, 450),
('siam_cc_old', 'black', 12, 3, 15, 188),
('siam_cc_old', 'black', 13, 4, 17, 359),
('siam_cc_old', 'black', 14, 4, 11, 418),
('siam_cc_old', 'black', 15, 4, 7, 424),
('siam_cc_old', 'black', 16, 3, 3, 231),
('siam_cc_old', 'black', 17, 4, 5, 396),
('siam_cc_old', 'black', 18, 5, 9, 540);

-- =====================================================
-- BLUE TEES - 6534 yards
-- =====================================================
INSERT INTO course_holes (course_id, tee_marker, hole_number, par, stroke_index, yardage) VALUES
('siam_cc_old', 'blue', 1, 5, 14, 506),
('siam_cc_old', 'blue', 2, 4, 18, 327),
('siam_cc_old', 'blue', 3, 4, 2, 413),
('siam_cc_old', 'blue', 4, 3, 16, 154),
('siam_cc_old', 'blue', 5, 4, 10, 370),
('siam_cc_old', 'blue', 6, 4, 6, 387),
('siam_cc_old', 'blue', 7, 5, 8, 520),
('siam_cc_old', 'blue', 8, 3, 12, 191),
('siam_cc_old', 'blue', 9, 4, 4, 391),
('siam_cc_old', 'blue', 10, 5, 13, 536),
('siam_cc_old', 'blue', 11, 4, 1, 424),
('siam_cc_old', 'blue', 12, 3, 15, 161),
('siam_cc_old', 'blue', 13, 4, 17, 327),
('siam_cc_old', 'blue', 14, 4, 11, 381),
('siam_cc_old', 'blue', 15, 4, 7, 386),
('siam_cc_old', 'blue', 16, 3, 3, 212),
('siam_cc_old', 'blue', 17, 4, 5, 369),
('siam_cc_old', 'blue', 18, 5, 9, 479);

-- =====================================================
-- WHITE TEES - 6191 yards
-- =====================================================
INSERT INTO course_holes (course_id, tee_marker, hole_number, par, stroke_index, yardage) VALUES
('siam_cc_old', 'white', 1, 5, 14, 475),
('siam_cc_old', 'white', 2, 4, 18, 274),
('siam_cc_old', 'white', 3, 4, 2, 403),
('siam_cc_old', 'white', 4, 3, 16, 148),
('siam_cc_old', 'white', 5, 4, 10, 363),
('siam_cc_old', 'white', 6, 4, 6, 379),
('siam_cc_old', 'white', 7, 5, 8, 512),
('siam_cc_old', 'white', 8, 3, 12, 182),
('siam_cc_old', 'white', 9, 4, 4, 375),
('siam_cc_old', 'white', 10, 5, 13, 505),
('siam_cc_old', 'white', 11, 4, 1, 372),
('siam_cc_old', 'white', 12, 3, 15, 154),
('siam_cc_old', 'white', 13, 4, 17, 302),
('siam_cc_old', 'white', 14, 4, 11, 372),
('siam_cc_old', 'white', 15, 4, 7, 374),
('siam_cc_old', 'white', 16, 3, 3, 186),
('siam_cc_old', 'white', 17, 4, 5, 344),
('siam_cc_old', 'white', 18, 5, 9, 471);

-- =====================================================
-- RED TEES - 5329 yards
-- =====================================================
INSERT INTO course_holes (course_id, tee_marker, hole_number, par, stroke_index, yardage) VALUES
('siam_cc_old', 'red', 1, 5, 14, 443),
('siam_cc_old', 'red', 2, 4, 18, 233),
('siam_cc_old', 'red', 3, 4, 2, 357),
('siam_cc_old', 'red', 4, 3, 16, 112),
('siam_cc_old', 'red', 5, 4, 10, 328),
('siam_cc_old', 'red', 6, 4, 6, 302),
('siam_cc_old', 'red', 7, 5, 8, 424),
('siam_cc_old', 'red', 8, 3, 12, 146),
('siam_cc_old', 'red', 9, 4, 4, 328),
('siam_cc_old', 'red', 10, 5, 13, 445),
('siam_cc_old', 'red', 11, 4, 1, 274),
('siam_cc_old', 'red', 12, 3, 15, 133),
('siam_cc_old', 'red', 13, 4, 17, 276),
('siam_cc_old', 'red', 14, 4, 11, 331),
('siam_cc_old', 'red', 15, 4, 7, 316),
('siam_cc_old', 'red', 16, 3, 3, 129),
('siam_cc_old', 'red', 17, 4, 5, 318),
('siam_cc_old', 'red', 18, 5, 9, 434);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check total yardages by tee marker
SELECT
    tee_marker,
    COUNT(*) as hole_count,
    SUM(yardage) as total_yardage,
    SUM(par) as total_par
FROM course_holes
WHERE course_id = 'siam_cc_old'
GROUP BY tee_marker
ORDER BY total_yardage DESC;

-- Expected Results:
-- Black: 7162 yards, Par 72
-- Blue:  6534 yards, Par 72
-- White: 6191 yards, Par 72
-- Red:   5329 yards, Par 72

-- Check all holes are present
SELECT
    tee_marker,
    GROUP_CONCAT(hole_number ORDER BY hole_number) as holes
FROM course_holes
WHERE course_id = 'siam_cc_old'
GROUP BY tee_marker;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT 'Siam Country Club - Old Course data loaded successfully!' as status,
       '4 tee markers with 18 holes each (72 total records)' as details,
       'Black: 7162 yds | Blue: 6534 yds | White: 6191 yds | Red: 5329 yds' as yardages;
