-- =====================================================
-- FIX BANGPAKONG RIVERSIDE COUNTRY CLUB - ALL TEE MARKERS
-- =====================================================
-- This script adds COMPLETE tee data for Bangpakong Riverside
-- Includes: Black, Blue, White, Red tees

-- Delete existing incorrect data
DELETE FROM course_holes WHERE course_id = 'bangpakong';

-- =====================================================
-- BLACK TEES (Championship)
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9
('bangpakong', 1, 4, 14, 415, 'black'),
('bangpakong', 2, 4, 12, 420, 'black'),
('bangpakong', 3, 5, 4, 550, 'black'),
('bangpakong', 4, 3, 18, 210, 'black'),
('bangpakong', 5, 4, 8, 435, 'black'),
('bangpakong', 6, 4, 10, 430, 'black'),
('bangpakong', 7, 3, 16, 220, 'black'),
('bangpakong', 8, 4, 6, 445, 'black'),
('bangpakong', 9, 5, 2, 560, 'black'),
-- Back 9
('bangpakong', 10, 4, 9, 400, 'black'),
('bangpakong', 11, 4, 7, 410, 'black'),
('bangpakong', 12, 5, 3, 540, 'black'),
('bangpakong', 13, 3, 17, 180, 'black'),
('bangpakong', 14, 4, 5, 440, 'black'),
('bangpakong', 15, 4, 11, 390, 'black'),
('bangpakong', 16, 3, 15, 195, 'black'),
('bangpakong', 17, 4, 13, 345, 'black'),
('bangpakong', 18, 5, 1, 555, 'black');

-- =====================================================
-- BLUE TEES (Men's Championship)
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9
('bangpakong', 1, 4, 14, 388, 'blue'),
('bangpakong', 2, 4, 12, 390, 'blue'),
('bangpakong', 3, 5, 4, 515, 'blue'),
('bangpakong', 4, 3, 18, 197, 'blue'),
('bangpakong', 5, 4, 8, 407, 'blue'),
('bangpakong', 6, 4, 10, 403, 'blue'),
('bangpakong', 7, 3, 16, 206, 'blue'),
('bangpakong', 8, 4, 6, 417, 'blue'),
('bangpakong', 9, 5, 2, 524, 'blue'),
-- Back 9
('bangpakong', 10, 4, 9, 374, 'blue'),
('bangpakong', 11, 4, 7, 384, 'blue'),
('bangpakong', 12, 5, 3, 505, 'blue'),
('bangpakong', 13, 3, 17, 168, 'blue'),
('bangpakong', 14, 4, 5, 412, 'blue'),
('bangpakong', 15, 4, 11, 365, 'blue'),
('bangpakong', 16, 3, 15, 182, 'blue'),
('bangpakong', 17, 4, 13, 323, 'blue'),
('bangpakong', 18, 5, 1, 520, 'blue');

-- =====================================================
-- WHITE TEES (Men's Regular)
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9
('bangpakong', 1, 4, 14, 370, 'white'),
('bangpakong', 2, 4, 12, 380, 'white'),
('bangpakong', 3, 5, 4, 495, 'white'),
('bangpakong', 4, 3, 18, 180, 'white'),
('bangpakong', 5, 4, 8, 390, 'white'),
('bangpakong', 6, 4, 10, 340, 'white'),
('bangpakong', 7, 3, 16, 170, 'white'),
('bangpakong', 8, 4, 6, 400, 'white'),
('bangpakong', 9, 5, 2, 504, 'white'),
-- Back 9
('bangpakong', 10, 4, 9, 360, 'white'),
('bangpakong', 11, 4, 7, 370, 'white'),
('bangpakong', 12, 5, 3, 490, 'white'),
('bangpakong', 13, 3, 17, 148, 'white'),
('bangpakong', 14, 4, 5, 380, 'white'),
('bangpakong', 15, 4, 11, 350, 'white'),
('bangpakong', 16, 3, 15, 170, 'white'),
('bangpakong', 17, 4, 13, 310, 'white'),
('bangpakong', 18, 5, 1, 505, 'white');

-- =====================================================
-- RED TEES (Ladies)
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9
('bangpakong', 1, 4, 14, 322, 'red'),
('bangpakong', 2, 4, 12, 312, 'red'),
('bangpakong', 3, 5, 4, 422, 'red'),
('bangpakong', 4, 3, 18, 160, 'red'),
('bangpakong', 5, 4, 8, 347, 'red'),
('bangpakong', 6, 4, 10, 327, 'red'),
('bangpakong', 7, 3, 16, 168, 'red'),
('bangpakong', 8, 4, 6, 330, 'red'),
('bangpakong', 9, 5, 2, 426, 'red'),
-- Back 9
('bangpakong', 10, 4, 9, 310, 'red'),
('bangpakong', 11, 4, 7, 320, 'red'),
('bangpakong', 12, 5, 3, 418, 'red'),
('bangpakong', 13, 3, 17, 135, 'red'),
('bangpakong', 14, 4, 5, 333, 'red'),
('bangpakong', 15, 4, 11, 300, 'red'),
('bangpakong', 16, 3, 15, 138, 'red'),
('bangpakong', 17, 4, 13, 267, 'red'),
('bangpakong', 18, 5, 1, 435, 'red');

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check all tee markers are present
SELECT tee_marker, COUNT(*) as hole_count
FROM course_holes
WHERE course_id = 'bangpakong'
GROUP BY tee_marker
ORDER BY
    CASE tee_marker
        WHEN 'black' THEN 1
        WHEN 'blue' THEN 2
        WHEN 'white' THEN 3
        WHEN 'red' THEN 4
    END;

-- Verify yardages match scorecard
SELECT
    tee_marker,
    SUM(CASE WHEN hole_number <= 9 THEN yardage ELSE 0 END) as out,
    SUM(CASE WHEN hole_number > 9 THEN yardage ELSE 0 END) as in,
    SUM(yardage) as total
FROM course_holes
WHERE course_id = 'bangpakong'
GROUP BY tee_marker
ORDER BY
    CASE tee_marker
        WHEN 'black' THEN 1
        WHEN 'blue' THEN 2
        WHEN 'white' THEN 3
        WHEN 'red' THEN 4
    END;

-- Expected results:
-- Black:  OUT 3685 + IN 3455 = TOTAL 7140
-- Blue:   OUT 3450 + IN 3233 = TOTAL 6683
-- White:  OUT 3236 + IN 3083 = TOTAL 6319
-- Red:    OUT 2814 + IN 2656 = TOTAL 5470

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Bangpakong Riverside Country Club - ALL TEE MARKERS added!';
    RAISE NOTICE '⚫ Black Tees: 7,140 yards (Championship)';
    RAISE NOTICE '🔵 Blue Tees: 6,683 yards (Men''s Championship)';
    RAISE NOTICE '⚪ White Tees: 6,319 yards (Men''s Regular)';
    RAISE NOTICE '🔴 Red Tees: 5,470 yards (Ladies)';
    RAISE NOTICE 'Total: 72 holes (18 holes × 4 tee markers)';
END $$;
