-- =====================================================
-- FIX BANGPAKONG RIVERSIDE COUNTRY CLUB - ALL TEE MARKERS
-- =====================================================
-- Correct data from actual scorecard
-- Includes: Black, Blue, White, Yellow, Red tees

DELETE FROM course_holes WHERE course_id = 'bangpakong';

-- =====================================================
-- BLACK TEES - 7140 yards
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('bangpakong', 1, 4, 13, 415, 'black'),
('bangpakong', 2, 4, 11, 420, 'black'),
('bangpakong', 3, 5, 15, 550, 'black'),
('bangpakong', 4, 3, 9, 210, 'black'),
('bangpakong', 5, 4, 3, 435, 'black'),
('bangpakong', 6, 4, 5, 430, 'black'),
('bangpakong', 7, 3, 17, 220, 'black'),
('bangpakong', 8, 4, 1, 445, 'black'),
('bangpakong', 9, 5, 7, 560, 'black'),
('bangpakong', 10, 4, 6, 400, 'black'),
('bangpakong', 11, 4, 12, 410, 'black'),
('bangpakong', 12, 5, 10, 540, 'black'),
('bangpakong', 13, 3, 14, 180, 'black'),
('bangpakong', 14, 4, 4, 440, 'black'),
('bangpakong', 15, 4, 16, 390, 'black'),
('bangpakong', 16, 3, 8, 195, 'black'),
('bangpakong', 17, 4, 18, 345, 'black'),
('bangpakong', 18, 5, 2, 555, 'black');

-- =====================================================
-- BLUE TEES - 6700 yards
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('bangpakong', 1, 4, 13, 388, 'blue'),
('bangpakong', 2, 4, 11, 393, 'blue'),
('bangpakong', 3, 5, 15, 515, 'blue'),
('bangpakong', 4, 3, 9, 197, 'blue'),
('bangpakong', 5, 4, 3, 407, 'blue'),
('bangpakong', 6, 4, 5, 403, 'blue'),
('bangpakong', 7, 3, 17, 206, 'blue'),
('bangpakong', 8, 4, 1, 417, 'blue'),
('bangpakong', 9, 5, 7, 535, 'blue'),
('bangpakong', 10, 4, 6, 380, 'blue'),
('bangpakong', 11, 4, 12, 384, 'blue'),
('bangpakong', 12, 5, 10, 505, 'blue'),
('bangpakong', 13, 3, 14, 168, 'blue'),
('bangpakong', 14, 4, 4, 412, 'blue'),
('bangpakong', 15, 4, 16, 365, 'blue'),
('bangpakong', 16, 3, 8, 182, 'blue'),
('bangpakong', 17, 4, 18, 323, 'blue'),
('bangpakong', 18, 5, 2, 520, 'blue');

-- =====================================================
-- WHITE TEES - 6393 yards
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('bangpakong', 1, 4, 13, 370, 'white'),
('bangpakong', 2, 4, 11, 380, 'white'),
('bangpakong', 3, 5, 15, 495, 'white'),
('bangpakong', 4, 3, 9, 180, 'white'),
('bangpakong', 5, 4, 3, 397, 'white'),
('bangpakong', 6, 4, 5, 375, 'white'),
('bangpakong', 7, 3, 17, 175, 'white'),
('bangpakong', 8, 4, 1, 400, 'white'),
('bangpakong', 9, 5, 7, 524, 'white'),
('bangpakong', 10, 4, 6, 374, 'white'),
('bangpakong', 11, 4, 12, 370, 'white'),
('bangpakong', 12, 5, 10, 490, 'white'),
('bangpakong', 13, 3, 14, 148, 'white'),
('bangpakong', 14, 4, 4, 380, 'white'),
('bangpakong', 15, 4, 16, 350, 'white'),
('bangpakong', 16, 3, 8, 170, 'white'),
('bangpakong', 17, 4, 18, 310, 'white'),
('bangpakong', 18, 5, 2, 505, 'white');

-- =====================================================
-- YELLOW TEES - 5851 yards
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('bangpakong', 1, 4, 13, 327, 'yellow'),
('bangpakong', 2, 4, 11, 334, 'yellow'),
('bangpakong', 3, 5, 15, 445, 'yellow'),
('bangpakong', 4, 3, 9, 160, 'yellow'),
('bangpakong', 5, 4, 3, 360, 'yellow'),
('bangpakong', 6, 4, 5, 347, 'yellow'),
('bangpakong', 7, 3, 17, 168, 'yellow'),
('bangpakong', 8, 4, 1, 345, 'yellow'),
('bangpakong', 9, 5, 7, 490, 'yellow'),
('bangpakong', 10, 4, 6, 354, 'yellow'),
('bangpakong', 11, 4, 12, 335, 'yellow'),
('bangpakong', 12, 5, 10, 475, 'yellow'),
('bangpakong', 13, 3, 14, 135, 'yellow'),
('bangpakong', 14, 4, 4, 343, 'yellow'),
('bangpakong', 15, 4, 16, 320, 'yellow'),
('bangpakong', 16, 3, 8, 145, 'yellow'),
('bangpakong', 17, 4, 18, 303, 'yellow'),
('bangpakong', 18, 5, 2, 465, 'yellow');

-- =====================================================
-- RED TEES - 5458 yards
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('bangpakong', 1, 4, 13, 322, 'red'),
('bangpakong', 2, 4, 11, 312, 'red'),
('bangpakong', 3, 5, 15, 422, 'red'),
('bangpakong', 4, 3, 9, 145, 'red'),
('bangpakong', 5, 4, 3, 347, 'red'),
('bangpakong', 6, 4, 5, 327, 'red'),
('bangpakong', 7, 3, 17, 158, 'red'),
('bangpakong', 8, 4, 1, 330, 'red'),
('bangpakong', 9, 5, 7, 446, 'red'),
('bangpakong', 10, 4, 6, 310, 'red'),
('bangpakong', 11, 4, 12, 320, 'red'),
('bangpakong', 12, 5, 10, 418, 'red'),
('bangpakong', 13, 3, 14, 128, 'red'),
('bangpakong', 14, 4, 4, 333, 'red'),
('bangpakong', 15, 4, 16, 300, 'red'),
('bangpakong', 16, 3, 8, 138, 'red'),
('bangpakong', 17, 4, 18, 267, 'red'),
('bangpakong', 18, 5, 2, 435, 'red');

SELECT tee_marker, SUM(yardage) as total, SUM(par) as par FROM course_holes WHERE course_id = 'bangpakong' GROUP BY tee_marker ORDER BY total DESC;
-- Expected: Black=7140, Blue=6700, White=6393, Yellow=5851, Red=5458, All Par 72
-- Fix Bangpra International Golf Club - ALL Tee Markers Data
-- This script deletes existing data and inserts complete tee marker information

-- Delete existing tee markers for this course
DELETE FROM course_holes WHERE course_id = 'bangpra_international';

-- Insert BLACK tee markers (7405 yards)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('bangpra_international', 1, 4, 3, 439, 'black'),
('bangpra_international', 2, 3, 15, 230, 'black'),
('bangpra_international', 3, 4, 11, 480, 'black'),
('bangpra_international', 4, 4, 5, 459, 'black'),
('bangpra_international', 5, 5, 9, 537, 'black'),
('bangpra_international', 6, 4, 1, 401, 'black'),
('bangpra_international', 7, 5, 7, 623, 'black'),
('bangpra_international', 8, 3, 13, 221, 'black'),
('bangpra_international', 9, 4, 17, 398, 'black'),
('bangpra_international', 10, 4, 18, 418, 'black'),
('bangpra_international', 11, 5, 2, 569, 'black'),
('bangpra_international', 12, 3, 16, 222, 'black'),
('bangpra_international', 13, 4, 10, 401, 'black'),
('bangpra_international', 14, 4, 6, 411, 'black'),
('bangpra_international', 15, 5, 14, 565, 'black'),
('bangpra_international', 16, 4, 4, 372, 'black'),
('bangpra_international', 17, 3, 12, 224, 'black'),
('bangpra_international', 18, 4, 8, 435, 'black');

-- Insert BLUE tee markers (6964 yards)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('bangpra_international', 1, 4, 3, 424, 'blue'),
('bangpra_international', 2, 3, 15, 189, 'blue'),
('bangpra_international', 3, 4, 11, 447, 'blue'),
('bangpra_international', 4, 4, 5, 426, 'blue'),
('bangpra_international', 5, 5, 9, 516, 'blue'),
('bangpra_international', 6, 4, 1, 391, 'blue'),
('bangpra_international', 7, 5, 7, 579, 'blue'),
('bangpra_international', 8, 3, 13, 187, 'blue'),
('bangpra_international', 9, 4, 17, 364, 'blue'),
('bangpra_international', 10, 4, 18, 409, 'blue'),
('bangpra_international', 11, 5, 2, 566, 'blue'),
('bangpra_international', 12, 3, 16, 184, 'blue'),
('bangpra_international', 13, 4, 10, 360, 'blue'),
('bangpra_international', 14, 4, 6, 398, 'blue'),
('bangpra_international', 15, 5, 14, 543, 'blue'),
('bangpra_international', 16, 4, 4, 363, 'blue'),
('bangpra_international', 17, 3, 12, 206, 'blue'),
('bangpra_international', 18, 4, 8, 412, 'blue');

-- Insert WHITE tee markers (6496 yards)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('bangpra_international', 1, 4, 3, 400, 'white'),
('bangpra_international', 2, 3, 15, 162, 'white'),
('bangpra_international', 3, 4, 11, 414, 'white'),
('bangpra_international', 4, 4, 5, 398, 'white'),
('bangpra_international', 5, 5, 9, 480, 'white'),
('bangpra_international', 6, 4, 1, 373, 'white'),
('bangpra_international', 7, 5, 7, 560, 'white'),
('bangpra_international', 8, 3, 13, 151, 'white'),
('bangpra_international', 9, 4, 17, 353, 'white'),
('bangpra_international', 10, 4, 18, 392, 'white'),
('bangpra_international', 11, 5, 2, 539, 'white'),
('bangpra_international', 12, 3, 16, 154, 'white'),
('bangpra_international', 13, 4, 10, 339, 'white'),
('bangpra_international', 14, 4, 6, 384, 'white'),
('bangpra_international', 15, 5, 14, 505, 'white'),
('bangpra_international', 16, 4, 4, 329, 'white'),
('bangpra_international', 17, 3, 12, 182, 'white'),
('bangpra_international', 18, 4, 8, 381, 'white');

-- Insert SILVER tee markers (5519 yards)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('bangpra_international', 1, 4, 3, 348, 'silver'),
('bangpra_international', 2, 3, 15, 138, 'silver'),
('bangpra_international', 3, 4, 11, 352, 'silver'),
('bangpra_international', 4, 4, 5, 303, 'silver'),
('bangpra_international', 5, 5, 9, 459, 'silver'),
('bangpra_international', 6, 4, 1, 298, 'silver'),
('bangpra_international', 7, 5, 7, 473, 'silver'),
('bangpra_international', 8, 3, 13, 132, 'silver'),
('bangpra_international', 9, 4, 17, 251, 'silver'),
('bangpra_international', 10, 4, 18, 322, 'silver'),
('bangpra_international', 11, 5, 2, 446, 'silver'),
('bangpra_international', 12, 3, 16, 117, 'silver'),
('bangpra_international', 13, 4, 10, 282, 'silver'),
('bangpra_international', 14, 4, 6, 317, 'silver'),
('bangpra_international', 15, 5, 14, 463, 'silver'),
('bangpra_international', 16, 4, 4, 316, 'silver'),
('bangpra_international', 17, 3, 12, 149, 'silver'),
('bangpra_international', 18, 4, 8, 353, 'silver');

-- Insert RED tee markers (5483 yards)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('bangpra_international', 1, 4, 3, 346, 'red'),
('bangpra_international', 2, 3, 15, 136, 'red'),
('bangpra_international', 3, 4, 11, 350, 'red'),
('bangpra_international', 4, 4, 5, 301, 'red'),
('bangpra_international', 5, 5, 9, 457, 'red'),
('bangpra_international', 6, 4, 1, 296, 'red'),
('bangpra_international', 7, 5, 7, 471, 'red'),
('bangpra_international', 8, 3, 13, 130, 'red'),
('bangpra_international', 9, 4, 17, 249, 'red'),
('bangpra_international', 10, 4, 18, 320, 'red'),
('bangpra_international', 11, 5, 2, 444, 'red'),
('bangpra_international', 12, 3, 16, 115, 'red'),
('bangpra_international', 13, 4, 10, 280, 'red'),
('bangpra_international', 14, 4, 6, 315, 'red'),
('bangpra_international', 15, 5, 14, 461, 'red'),
('bangpra_international', 16, 4, 4, 314, 'red'),
('bangpra_international', 17, 3, 12, 147, 'red'),
('bangpra_international', 18, 4, 8, 351, 'red');

-- Verification queries to check totals
SELECT
    tee_marker,
    COUNT(*) as hole_count,
    SUM(par) as total_par,
    SUM(yardage) as total_yardage
FROM course_holes
WHERE course_id = 'bangpra_international'
GROUP BY tee_marker
ORDER BY total_yardage DESC;

-- Expected Results:
-- Black: 18 holes, Par 72, 7405 yards
-- Blue:  18 holes, Par 72, 6964 yards
-- White: 18 holes, Par 72, 6496 yards
-- Silver: 18 holes, Par 72, 5519 yards
-- Red:   18 holes, Par 72, 5483 yards

SELECT 'Bangpra International Golf Club - All 5 tee markers successfully inserted!' as status;
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
-- =====================================================
-- CRYSTAL BAY GOLF CLUB - ALL TEE MARKERS
-- =====================================================
-- 27-hole facility with 3 nine-hole courses: A, B, C
-- Creating 3 separate 18-hole combinations
-- Tee Markers: Blue, White, Yellow, Red
-- =====================================================

DELETE FROM course_holes WHERE course_id IN ('crystal_bay_ab', 'crystal_bay_ac', 'crystal_bay_bc');

-- =====================================================
-- COMBINATION 1: COURSE A+B (crystal_bay_ab)
-- =====================================================

-- BLUE TEES - Course A+B
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Course A (holes 1-9)
('crystal_bay_ab', 1, 4, 16, 389, 'blue'),
('crystal_bay_ab', 2, 4, 2, 435, 'blue'),
('crystal_bay_ab', 3, 4, 4, 430, 'blue'),
('crystal_bay_ab', 4, 5, 8, 472, 'blue'),
('crystal_bay_ab', 5, 4, 12, 373, 'blue'),
('crystal_bay_ab', 6, 3, 18, 162, 'blue'),
('crystal_bay_ab', 7, 4, 10, 420, 'blue'),
('crystal_bay_ab', 8, 5, 6, 497, 'blue'),
('crystal_bay_ab', 9, 3, 14, 138, 'blue'),
-- Course B (holes 10-18)
('crystal_bay_ab', 10, 4, 13, 388, 'blue'),
('crystal_bay_ab', 11, 4, 11, 376, 'blue'),
('crystal_bay_ab', 12, 4, 7, 440, 'blue'),
('crystal_bay_ab', 13, 5, 9, 484, 'blue'),
('crystal_bay_ab', 14, 3, 17, 172, 'blue'),
('crystal_bay_ab', 15, 5, 3, 476, 'blue'),
('crystal_bay_ab', 16, 4, 5, 429, 'blue'),
('crystal_bay_ab', 17, 3, 15, 332, 'blue'),
('crystal_bay_ab', 18, 4, 1, 410, 'blue');

-- WHITE TEES - Course A+B
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Course A (holes 1-9)
('crystal_bay_ab', 1, 4, 16, 359, 'white'),
('crystal_bay_ab', 2, 4, 2, 408, 'white'),
('crystal_bay_ab', 3, 4, 4, 399, 'white'),
('crystal_bay_ab', 4, 5, 8, 452, 'white'),
('crystal_bay_ab', 5, 4, 12, 345, 'white'),
('crystal_bay_ab', 6, 3, 18, 147, 'white'),
('crystal_bay_ab', 7, 4, 10, 394, 'white'),
('crystal_bay_ab', 8, 5, 6, 467, 'white'),
('crystal_bay_ab', 9, 3, 14, 138, 'white'),
-- Course B (holes 10-18)
('crystal_bay_ab', 10, 4, 13, 388, 'white'),
('crystal_bay_ab', 11, 4, 11, 350, 'white'),
('crystal_bay_ab', 12, 4, 7, 413, 'white'),
('crystal_bay_ab', 13, 5, 9, 456, 'white'),
('crystal_bay_ab', 14, 3, 17, 147, 'white'),
('crystal_bay_ab', 15, 5, 3, 450, 'white'),
('crystal_bay_ab', 16, 4, 5, 402, 'white'),
('crystal_bay_ab', 17, 3, 15, 308, 'white'),
('crystal_bay_ab', 18, 4, 1, 385, 'white');

-- YELLOW TEES - Course A+B
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Course A (holes 1-9)
('crystal_bay_ab', 1, 4, 16, 341, 'yellow'),
('crystal_bay_ab', 2, 4, 2, 360, 'yellow'),
('crystal_bay_ab', 3, 4, 4, 370, 'yellow'),
('crystal_bay_ab', 4, 5, 8, 433, 'yellow'),
('crystal_bay_ab', 5, 4, 12, 318, 'yellow'),
('crystal_bay_ab', 6, 3, 18, 138, 'yellow'),
('crystal_bay_ab', 7, 4, 10, 364, 'yellow'),
('crystal_bay_ab', 8, 5, 6, 438, 'yellow'),
('crystal_bay_ab', 9, 3, 14, 135, 'yellow'),
-- Course B (holes 10-18)
('crystal_bay_ab', 10, 4, 13, 346, 'yellow'),
('crystal_bay_ab', 11, 4, 11, 336, 'yellow'),
('crystal_bay_ab', 12, 4, 7, 388, 'yellow'),
('crystal_bay_ab', 13, 5, 9, 440, 'yellow'),
('crystal_bay_ab', 14, 3, 17, 139, 'yellow'),
('crystal_bay_ab', 15, 5, 3, 412, 'yellow'),
('crystal_bay_ab', 16, 4, 5, 381, 'yellow'),
('crystal_bay_ab', 17, 3, 15, 300, 'yellow'),
('crystal_bay_ab', 18, 4, 1, 363, 'yellow');

-- RED TEES - Course A+B
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Course A (holes 1-9)
('crystal_bay_ab', 1, 4, 16, 310, 'red'),
('crystal_bay_ab', 2, 4, 2, 339, 'red'),
('crystal_bay_ab', 3, 4, 4, 340, 'red'),
('crystal_bay_ab', 4, 5, 8, 403, 'red'),
('crystal_bay_ab', 5, 4, 12, 152, 'red'),
('crystal_bay_ab', 6, 3, 18, 109, 'red'),
('crystal_bay_ab', 7, 4, 10, 328, 'red'),
('crystal_bay_ab', 8, 5, 6, 430, 'red'),
('crystal_bay_ab', 9, 3, 14, 74, 'red'),
-- Course B (holes 10-18)
('crystal_bay_ab', 10, 4, 13, 320, 'red'),
('crystal_bay_ab', 11, 4, 11, 308, 'red'),
('crystal_bay_ab', 12, 4, 7, 340, 'red'),
('crystal_bay_ab', 13, 5, 9, 416, 'red'),
('crystal_bay_ab', 14, 3, 17, 98, 'red'),
('crystal_bay_ab', 15, 5, 3, 381, 'red'),
('crystal_bay_ab', 16, 4, 5, 345, 'red'),
('crystal_bay_ab', 17, 3, 15, 152, 'red'),
('crystal_bay_ab', 18, 4, 1, 306, 'red');

-- =====================================================
-- COMBINATION 2: COURSE A+C (crystal_bay_ac)
-- =====================================================

-- BLUE TEES - Course A+C
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Course A (holes 1-9)
('crystal_bay_ac', 1, 4, 16, 389, 'blue'),
('crystal_bay_ac', 2, 4, 2, 435, 'blue'),
('crystal_bay_ac', 3, 4, 4, 430, 'blue'),
('crystal_bay_ac', 4, 5, 8, 472, 'blue'),
('crystal_bay_ac', 5, 4, 12, 373, 'blue'),
('crystal_bay_ac', 6, 3, 18, 162, 'blue'),
('crystal_bay_ac', 7, 4, 10, 420, 'blue'),
('crystal_bay_ac', 8, 5, 6, 497, 'blue'),
('crystal_bay_ac', 9, 3, 14, 138, 'blue'),
-- Course C (holes 10-18)
('crystal_bay_ac', 10, 4, 18, 378, 'blue'),
('crystal_bay_ac', 11, 4, 6, 411, 'blue'),
('crystal_bay_ac', 12, 3, 14, 167, 'blue'),
('crystal_bay_ac', 13, 4, 8, 302, 'blue'),
('crystal_bay_ac', 14, 5, 10, 427, 'blue'),
('crystal_bay_ac', 15, 3, 16, 331, 'blue'),
('crystal_bay_ac', 16, 4, 2, 160, 'blue'),
('crystal_bay_ac', 17, 4, 12, 413, 'blue'),
('crystal_bay_ac', 18, 4, 4, 326, 'blue');

-- WHITE TEES - Course A+C
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Course A (holes 1-9)
('crystal_bay_ac', 1, 4, 16, 359, 'white'),
('crystal_bay_ac', 2, 4, 2, 408, 'white'),
('crystal_bay_ac', 3, 4, 4, 399, 'white'),
('crystal_bay_ac', 4, 5, 8, 452, 'white'),
('crystal_bay_ac', 5, 4, 12, 345, 'white'),
('crystal_bay_ac', 6, 3, 18, 147, 'white'),
('crystal_bay_ac', 7, 4, 10, 394, 'white'),
('crystal_bay_ac', 8, 5, 6, 467, 'white'),
('crystal_bay_ac', 9, 3, 14, 138, 'white'),
-- Course C (holes 10-18)
('crystal_bay_ac', 10, 4, 18, 359, 'white'),
('crystal_bay_ac', 11, 4, 6, 391, 'white'),
('crystal_bay_ac', 12, 3, 14, 156, 'white'),
('crystal_bay_ac', 13, 4, 8, 289, 'white'),
('crystal_bay_ac', 14, 5, 10, 401, 'white'),
('crystal_bay_ac', 15, 3, 16, 305, 'white'),
('crystal_bay_ac', 16, 4, 2, 150, 'white'),
('crystal_bay_ac', 17, 4, 12, 388, 'white'),
('crystal_bay_ac', 18, 4, 4, 361, 'white');

-- YELLOW TEES - Course A+C
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Course A (holes 1-9)
('crystal_bay_ac', 1, 4, 16, 341, 'yellow'),
('crystal_bay_ac', 2, 4, 2, 360, 'yellow'),
('crystal_bay_ac', 3, 4, 4, 370, 'yellow'),
('crystal_bay_ac', 4, 5, 8, 433, 'yellow'),
('crystal_bay_ac', 5, 4, 12, 318, 'yellow'),
('crystal_bay_ac', 6, 3, 18, 138, 'yellow'),
('crystal_bay_ac', 7, 4, 10, 364, 'yellow'),
('crystal_bay_ac', 8, 5, 6, 438, 'yellow'),
('crystal_bay_ac', 9, 3, 14, 135, 'yellow'),
-- Course C (holes 10-18)
('crystal_bay_ac', 10, 4, 18, 313, 'yellow'),
('crystal_bay_ac', 11, 4, 6, 365, 'yellow'),
('crystal_bay_ac', 12, 3, 14, 137, 'yellow'),
('crystal_bay_ac', 13, 4, 8, 164, 'yellow'),
('crystal_bay_ac', 14, 5, 10, 367, 'yellow'),
('crystal_bay_ac', 15, 3, 16, 278, 'yellow'),
('crystal_bay_ac', 16, 4, 2, 132, 'yellow'),
('crystal_bay_ac', 17, 4, 12, 368, 'yellow'),
('crystal_bay_ac', 18, 4, 4, 463, 'yellow');

-- RED TEES - Course A+C
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Course A (holes 1-9)
('crystal_bay_ac', 1, 4, 16, 310, 'red'),
('crystal_bay_ac', 2, 4, 2, 339, 'red'),
('crystal_bay_ac', 3, 4, 4, 340, 'red'),
('crystal_bay_ac', 4, 5, 8, 403, 'red'),
('crystal_bay_ac', 5, 4, 12, 152, 'red'),
('crystal_bay_ac', 6, 3, 18, 109, 'red'),
('crystal_bay_ac', 7, 4, 10, 328, 'red'),
('crystal_bay_ac', 8, 5, 6, 430, 'red'),
('crystal_bay_ac', 9, 3, 14, 74, 'red'),
-- Course C (holes 10-18)
('crystal_bay_ac', 10, 4, 18, 278, 'red'),
('crystal_bay_ac', 11, 4, 6, 311, 'red'),
('crystal_bay_ac', 12, 3, 14, 116, 'red'),
('crystal_bay_ac', 13, 4, 8, 145, 'red'),
('crystal_bay_ac', 14, 5, 10, 347, 'red'),
('crystal_bay_ac', 15, 3, 16, 247, 'red'),
('crystal_bay_ac', 16, 4, 2, 120, 'red'),
('crystal_bay_ac', 17, 4, 12, 340, 'red'),
('crystal_bay_ac', 18, 4, 4, 445, 'red');

-- =====================================================
-- COMBINATION 3: COURSE B+C (crystal_bay_bc)
-- =====================================================

-- BLUE TEES - Course B+C
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Course B (holes 1-9)
('crystal_bay_bc', 1, 4, 13, 388, 'blue'),
('crystal_bay_bc', 2, 4, 11, 376, 'blue'),
('crystal_bay_bc', 3, 4, 7, 440, 'blue'),
('crystal_bay_bc', 4, 5, 9, 484, 'blue'),
('crystal_bay_bc', 5, 3, 17, 172, 'blue'),
('crystal_bay_bc', 6, 5, 3, 476, 'blue'),
('crystal_bay_bc', 7, 4, 5, 429, 'blue'),
('crystal_bay_bc', 8, 3, 15, 332, 'blue'),
('crystal_bay_bc', 9, 4, 1, 410, 'blue'),
-- Course C (holes 10-18)
('crystal_bay_bc', 10, 4, 18, 378, 'blue'),
('crystal_bay_bc', 11, 4, 6, 411, 'blue'),
('crystal_bay_bc', 12, 3, 14, 167, 'blue'),
('crystal_bay_bc', 13, 4, 8, 302, 'blue'),
('crystal_bay_bc', 14, 5, 10, 427, 'blue'),
('crystal_bay_bc', 15, 3, 16, 331, 'blue'),
('crystal_bay_bc', 16, 4, 2, 160, 'blue'),
('crystal_bay_bc', 17, 4, 12, 413, 'blue'),
('crystal_bay_bc', 18, 4, 4, 326, 'blue');

-- WHITE TEES - Course B+C
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Course B (holes 1-9)
('crystal_bay_bc', 1, 4, 13, 388, 'white'),
('crystal_bay_bc', 2, 4, 11, 350, 'white'),
('crystal_bay_bc', 3, 4, 7, 413, 'white'),
('crystal_bay_bc', 4, 5, 9, 456, 'white'),
('crystal_bay_bc', 5, 3, 17, 147, 'white'),
('crystal_bay_bc', 6, 5, 3, 450, 'white'),
('crystal_bay_bc', 7, 4, 5, 402, 'white'),
('crystal_bay_bc', 8, 3, 15, 308, 'white'),
('crystal_bay_bc', 9, 4, 1, 385, 'white'),
-- Course C (holes 10-18)
('crystal_bay_bc', 10, 4, 18, 359, 'white'),
('crystal_bay_bc', 11, 4, 6, 391, 'white'),
('crystal_bay_bc', 12, 3, 14, 156, 'white'),
('crystal_bay_bc', 13, 4, 8, 289, 'white'),
('crystal_bay_bc', 14, 5, 10, 401, 'white'),
('crystal_bay_bc', 15, 3, 16, 305, 'white'),
('crystal_bay_bc', 16, 4, 2, 150, 'white'),
('crystal_bay_bc', 17, 4, 12, 388, 'white'),
('crystal_bay_bc', 18, 4, 4, 361, 'white');

-- YELLOW TEES - Course B+C
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Course B (holes 1-9)
('crystal_bay_bc', 1, 4, 13, 346, 'yellow'),
('crystal_bay_bc', 2, 4, 11, 336, 'yellow'),
('crystal_bay_bc', 3, 4, 7, 388, 'yellow'),
('crystal_bay_bc', 4, 5, 9, 440, 'yellow'),
('crystal_bay_bc', 5, 3, 17, 139, 'yellow'),
('crystal_bay_bc', 6, 5, 3, 412, 'yellow'),
('crystal_bay_bc', 7, 4, 5, 381, 'yellow'),
('crystal_bay_bc', 8, 3, 15, 300, 'yellow'),
('crystal_bay_bc', 9, 4, 1, 363, 'yellow'),
-- Course C (holes 10-18)
('crystal_bay_bc', 10, 4, 18, 313, 'yellow'),
('crystal_bay_bc', 11, 4, 6, 365, 'yellow'),
('crystal_bay_bc', 12, 3, 14, 137, 'yellow'),
('crystal_bay_bc', 13, 4, 8, 164, 'yellow'),
('crystal_bay_bc', 14, 5, 10, 367, 'yellow'),
('crystal_bay_bc', 15, 3, 16, 278, 'yellow'),
('crystal_bay_bc', 16, 4, 2, 132, 'yellow'),
('crystal_bay_bc', 17, 4, 12, 368, 'yellow'),
('crystal_bay_bc', 18, 4, 4, 463, 'yellow');

-- RED TEES - Course B+C
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Course B (holes 1-9)
('crystal_bay_bc', 1, 4, 13, 320, 'red'),
('crystal_bay_bc', 2, 4, 11, 308, 'red'),
('crystal_bay_bc', 3, 4, 7, 340, 'red'),
('crystal_bay_bc', 4, 5, 9, 416, 'red'),
('crystal_bay_bc', 5, 3, 17, 98, 'red'),
('crystal_bay_bc', 6, 5, 3, 381, 'red'),
('crystal_bay_bc', 7, 4, 5, 345, 'red'),
('crystal_bay_bc', 8, 3, 15, 152, 'red'),
('crystal_bay_bc', 9, 4, 1, 306, 'red'),
-- Course C (holes 10-18)
('crystal_bay_bc', 10, 4, 18, 278, 'red'),
('crystal_bay_bc', 11, 4, 6, 311, 'red'),
('crystal_bay_bc', 12, 3, 14, 116, 'red'),
('crystal_bay_bc', 13, 4, 8, 145, 'red'),
('crystal_bay_bc', 14, 5, 10, 347, 'red'),
('crystal_bay_bc', 15, 3, 16, 247, 'red'),
('crystal_bay_bc', 16, 4, 2, 120, 'red'),
('crystal_bay_bc', 17, 4, 12, 340, 'red'),
('crystal_bay_bc', 18, 4, 4, 445, 'red');

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT
    course_id,
    tee_marker,
    COUNT(*) as holes,
    SUM(par) as par,
    SUM(yardage) as yards
FROM course_holes
WHERE course_id IN ('crystal_bay_ab', 'crystal_bay_ac', 'crystal_bay_bc')
GROUP BY course_id, tee_marker
ORDER BY course_id, yards DESC;

-- Expected Results:
-- crystal_bay_ab: Blue 6823, White 6408, Yellow 6002, Red 5151 (all Par 72)
-- crystal_bay_ac: Blue 6231, White 5909, Yellow 5484, Red 4834 (all Par 70)
-- crystal_bay_bc: Blue 6422, White 6099, Yellow 5692, Red 5015 (all Par 70)
-- Fix Grand Prix Golf Club - Complete Tee Data
-- Extracted from scorecard: GrandPrixGolfClub.jpg
-- Date: 2025-10-18

-- Delete existing data for Grand Prix Golf Club
DELETE FROM course_holes WHERE course_id = 'grand_prix';

-- RED TEE (5534 yards total)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('grand_prix', 1, 4, 8, 387, 'red'),
('grand_prix', 2, 4, 13, 321, 'red'),
('grand_prix', 3, 3, 11, 115, 'red'),
('grand_prix', 4, 4, 15, 376, 'red'),
('grand_prix', 5, 5, 16, 405, 'red'),
('grand_prix', 6, 4, 6, 273, 'red'),
('grand_prix', 7, 3, 2, 119, 'red'),
('grand_prix', 8, 4, 18, 321, 'red'),
('grand_prix', 9, 5, 7, 413, 'red'),
('grand_prix', 10, 4, 12, 330, 'red'),
('grand_prix', 11, 5, 9, 454, 'red'),
('grand_prix', 12, 3, 3, 109, 'red'),
('grand_prix', 13, 4, 14, 308, 'red'),
('grand_prix', 14, 3, 10, 105, 'red'),
('grand_prix', 15, 4, 4, 259, 'red'),
('grand_prix', 16, 4, 5, 262, 'red'),
('grand_prix', 17, 4, 17, 327, 'red'),
('grand_prix', 18, 5, 1, 487, 'red');

-- YELLOW TEE (5841 yards total)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('grand_prix', 1, 4, 8, 399, 'yellow'),
('grand_prix', 2, 4, 13, 350, 'yellow'),
('grand_prix', 3, 3, 11, 127, 'yellow'),
('grand_prix', 4, 4, 15, 398, 'yellow'),
('grand_prix', 5, 5, 16, 443, 'yellow'),
('grand_prix', 6, 4, 6, 306, 'yellow'),
('grand_prix', 7, 3, 2, 129, 'yellow'),
('grand_prix', 8, 4, 18, 357, 'yellow'),
('grand_prix', 9, 5, 7, 431, 'yellow'),
('grand_prix', 10, 4, 12, 357, 'yellow'),
('grand_prix', 11, 5, 9, 489, 'yellow'),
('grand_prix', 12, 3, 3, 144, 'yellow'),
('grand_prix', 13, 4, 14, 357, 'yellow'),
('grand_prix', 14, 3, 10, 117, 'yellow'),
('grand_prix', 15, 4, 4, 294, 'yellow'),
('grand_prix', 16, 4, 5, 292, 'yellow'),
('grand_prix', 17, 4, 17, 341, 'yellow'),
('grand_prix', 18, 5, 1, 510, 'yellow');

-- WHITE TEE (6258 yards total)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('grand_prix', 1, 4, 8, 420, 'white'),
('grand_prix', 2, 4, 13, 390, 'white'),
('grand_prix', 3, 3, 11, 157, 'white'),
('grand_prix', 4, 4, 15, 408, 'white'),
('grand_prix', 5, 5, 16, 464, 'white'),
('grand_prix', 6, 4, 6, 330, 'white'),
('grand_prix', 7, 3, 2, 146, 'white'),
('grand_prix', 8, 4, 18, 386, 'white'),
('grand_prix', 9, 5, 7, 456, 'white'),
('grand_prix', 10, 4, 12, 376, 'white'),
('grand_prix', 11, 5, 9, 513, 'white'),
('grand_prix', 12, 3, 3, 169, 'white'),
('grand_prix', 13, 4, 14, 384, 'white'),
('grand_prix', 14, 3, 10, 125, 'white'),
('grand_prix', 15, 4, 4, 316, 'white'),
('grand_prix', 16, 4, 5, 311, 'white'),
('grand_prix', 17, 4, 17, 372, 'white'),
('grand_prix', 18, 5, 1, 535, 'white');

-- BLUE TEE (6627 yards total)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('grand_prix', 1, 4, 8, 437, 'blue'),
('grand_prix', 2, 4, 13, 407, 'blue'),
('grand_prix', 3, 3, 11, 182, 'blue'),
('grand_prix', 4, 4, 15, 432, 'blue'),
('grand_prix', 5, 5, 16, 484, 'blue'),
('grand_prix', 6, 4, 6, 353, 'blue'),
('grand_prix', 7, 3, 2, 152, 'blue'),
('grand_prix', 8, 4, 18, 412, 'blue'),
('grand_prix', 9, 5, 7, 473, 'blue'),
('grand_prix', 10, 4, 12, 398, 'blue'),
('grand_prix', 11, 5, 9, 534, 'blue'),
('grand_prix', 12, 3, 3, 180, 'blue'),
('grand_prix', 13, 4, 14, 406, 'blue'),
('grand_prix', 14, 3, 10, 148, 'blue'),
('grand_prix', 15, 4, 4, 339, 'blue'),
('grand_prix', 16, 4, 5, 330, 'blue'),
('grand_prix', 17, 4, 17, 395, 'blue'),
('grand_prix', 18, 5, 1, 565, 'blue');

-- BLACK TEE (7111 yards total)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('grand_prix', 1, 4, 8, 453, 'black'),
('grand_prix', 2, 4, 13, 432, 'black'),
('grand_prix', 3, 3, 11, 216, 'black'),
('grand_prix', 4, 4, 15, 460, 'black'),
('grand_prix', 5, 5, 16, 509, 'black'),
('grand_prix', 6, 4, 6, 378, 'black'),
('grand_prix', 7, 3, 2, 170, 'black'),
('grand_prix', 8, 4, 18, 442, 'black'),
('grand_prix', 9, 5, 7, 501, 'black'),
('grand_prix', 10, 4, 12, 429, 'black'),
('grand_prix', 11, 5, 9, 568, 'black'),
('grand_prix', 12, 3, 3, 205, 'black'),
('grand_prix', 13, 4, 14, 429, 'black'),
('grand_prix', 14, 3, 10, 172, 'black'),
('grand_prix', 15, 4, 4, 365, 'black'),
('grand_prix', 16, 4, 5, 361, 'black'),
('grand_prix', 17, 4, 17, 427, 'black'),
('grand_prix', 18, 5, 1, 594, 'black');

-- Verification queries
SELECT
    tee_marker,
    COUNT(*) as hole_count,
    SUM(yardage) as total_yardage,
    SUM(par) as total_par
FROM course_holes
WHERE course_id = 'grand_prix'
GROUP BY tee_marker
ORDER BY total_yardage;

-- Expected results:
-- red:    18 holes, 5534 yards, Par 72
-- yellow: 18 holes, 5841 yards, Par 72
-- white:  18 holes, 6258 yards, Par 72
-- blue:   18 holes, 6627 yards, Par 72
-- black:  18 holes, 7111 yards, Par 72

SELECT 'Grand Prix Golf Club data updated successfully!' as status,
       'All 5 tee markers loaded: red (5534), yellow (5841), white (6258), blue (6627), black (7111)' as tees;
-- =====================================================================
-- Khao Kheow Country Club - Complete Tee Marker Data
-- =====================================================================
-- This is a 27-hole facility with three 9-hole courses (A, B, C)
-- Combined into three 18-hole configurations:
--   - khao_kheow_ab (A nine + B nine)
--   - khao_kheow_ac (A nine + C nine)
--   - khao_kheow_bc (B nine + C nine)
--
-- All tee markers: blue, yellow, white, red (lowercase)
-- =====================================================================

-- Clean up existing data
DELETE FROM course_holes WHERE course_id LIKE 'khao_kheow_%';

-- =====================================================================
-- COURSE COMBINATION 1: Khao Kheow A+B (khao_kheow_ab)
-- Course A (Holes 1-9) + Course B (Holes 10-18)
-- =====================================================================

-- Course A - Blue Tees (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_ab', 1, 4, 1, 354, 'blue'),
('khao_kheow_ab', 2, 5, 2, 592, 'blue'),
('khao_kheow_ab', 3, 3, 3, 194, 'blue'),
('khao_kheow_ab', 4, 4, 4, 462, 'blue'),
('khao_kheow_ab', 5, 3, 5, 175, 'blue'),
('khao_kheow_ab', 6, 4, 6, 433, 'blue'),
('khao_kheow_ab', 7, 4, 7, 364, 'blue'),
('khao_kheow_ab', 8, 5, 8, 489, 'blue'),
('khao_kheow_ab', 9, 4, 9, 430, 'blue');

-- Course B - Blue Tees (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_ab', 10, 4, 10, 430, 'blue'),
('khao_kheow_ab', 11, 5, 11, 553, 'blue'),
('khao_kheow_ab', 12, 3, 12, 199, 'blue'),
('khao_kheow_ab', 13, 4, 13, 426, 'blue'),
('khao_kheow_ab', 14, 4, 14, 375, 'blue'),
('khao_kheow_ab', 15, 5, 15, 560, 'blue'),
('khao_kheow_ab', 16, 4, 16, 465, 'blue'),
('khao_kheow_ab', 17, 3, 17, 146, 'blue'),
('khao_kheow_ab', 18, 4, 18, 430, 'blue');

-- Course A - Yellow Tees (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_ab', 1, 4, 1, 298, 'yellow'),
('khao_kheow_ab', 2, 5, 2, 533, 'yellow'),
('khao_kheow_ab', 3, 3, 3, 184, 'yellow'),
('khao_kheow_ab', 4, 4, 4, 417, 'yellow'),
('khao_kheow_ab', 5, 3, 5, 132, 'yellow'),
('khao_kheow_ab', 6, 4, 6, 384, 'yellow'),
('khao_kheow_ab', 7, 4, 7, 296, 'yellow'),
('khao_kheow_ab', 8, 5, 8, 459, 'yellow'),
('khao_kheow_ab', 9, 4, 9, 404, 'yellow');

-- Course B - Yellow Tees (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_ab', 10, 4, 10, 371, 'yellow'),
('khao_kheow_ab', 11, 5, 11, 526, 'yellow'),
('khao_kheow_ab', 12, 3, 12, 168, 'yellow'),
('khao_kheow_ab', 13, 4, 13, 382, 'yellow'),
('khao_kheow_ab', 14, 4, 14, 340, 'yellow'),
('khao_kheow_ab', 15, 5, 15, 510, 'yellow'),
('khao_kheow_ab', 16, 4, 16, 424, 'yellow'),
('khao_kheow_ab', 17, 3, 17, 128, 'yellow'),
('khao_kheow_ab', 18, 4, 18, 403, 'yellow');

-- Course A - White Tees (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_ab', 1, 4, 1, 269, 'white'),
('khao_kheow_ab', 2, 5, 2, 489, 'white'),
('khao_kheow_ab', 3, 3, 3, 164, 'white'),
('khao_kheow_ab', 4, 4, 4, 387, 'white'),
('khao_kheow_ab', 5, 3, 5, 122, 'white'),
('khao_kheow_ab', 6, 4, 6, 347, 'white'),
('khao_kheow_ab', 7, 4, 7, 262, 'white'),
('khao_kheow_ab', 8, 5, 8, 408, 'white'),
('khao_kheow_ab', 9, 4, 9, 373, 'white');

-- Course B - White Tees (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_ab', 10, 4, 10, 327, 'white'),
('khao_kheow_ab', 11, 5, 11, 490, 'white'),
('khao_kheow_ab', 12, 3, 12, 155, 'white'),
('khao_kheow_ab', 13, 4, 13, 336, 'white'),
('khao_kheow_ab', 14, 4, 14, 306, 'white'),
('khao_kheow_ab', 15, 5, 15, 458, 'white'),
('khao_kheow_ab', 16, 4, 16, 389, 'white'),
('khao_kheow_ab', 17, 3, 17, 124, 'white'),
('khao_kheow_ab', 18, 4, 18, 366, 'white');

-- Course A - Red Tees (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_ab', 1, 4, 1, 237, 'red'),
('khao_kheow_ab', 2, 5, 2, 443, 'red'),
('khao_kheow_ab', 3, 3, 3, 123, 'red'),
('khao_kheow_ab', 4, 4, 4, 329, 'red'),
('khao_kheow_ab', 5, 3, 5, 93, 'red'),
('khao_kheow_ab', 6, 4, 6, 309, 'red'),
('khao_kheow_ab', 7, 4, 7, 239, 'red'),
('khao_kheow_ab', 8, 5, 8, 347, 'red'),
('khao_kheow_ab', 9, 4, 9, 331, 'red');

-- Course B - Red Tees (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_ab', 10, 4, 10, 311, 'red'),
('khao_kheow_ab', 11, 5, 11, 449, 'red'),
('khao_kheow_ab', 12, 3, 12, 125, 'red'),
('khao_kheow_ab', 13, 4, 13, 285, 'red'),
('khao_kheow_ab', 14, 4, 14, 295, 'red'),
('khao_kheow_ab', 15, 5, 15, 413, 'red'),
('khao_kheow_ab', 16, 4, 16, 319, 'red'),
('khao_kheow_ab', 17, 3, 17, 104, 'red'),
('khao_kheow_ab', 18, 4, 18, 307, 'red');

-- =====================================================================
-- COURSE COMBINATION 2: Khao Kheow A+C (khao_kheow_ac)
-- Course A (Holes 1-9) + Course C (Holes 10-18)
-- =====================================================================

-- Course A - Blue Tees (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_ac', 1, 4, 1, 354, 'blue'),
('khao_kheow_ac', 2, 5, 2, 592, 'blue'),
('khao_kheow_ac', 3, 3, 3, 194, 'blue'),
('khao_kheow_ac', 4, 4, 4, 462, 'blue'),
('khao_kheow_ac', 5, 3, 5, 175, 'blue'),
('khao_kheow_ac', 6, 4, 6, 433, 'blue'),
('khao_kheow_ac', 7, 4, 7, 364, 'blue'),
('khao_kheow_ac', 8, 5, 8, 489, 'blue'),
('khao_kheow_ac', 9, 4, 9, 430, 'blue');

-- Course C - Blue Tees (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_ac', 10, 5, 10, 550, 'blue'),
('khao_kheow_ac', 11, 4, 11, 442, 'blue'),
('khao_kheow_ac', 12, 3, 12, 184, 'blue'),
('khao_kheow_ac', 13, 4, 13, 378, 'blue'),
('khao_kheow_ac', 14, 4, 14, 398, 'blue'),
('khao_kheow_ac', 15, 4, 15, 402, 'blue'),
('khao_kheow_ac', 16, 5, 16, 556, 'blue'),
('khao_kheow_ac', 17, 3, 17, 180, 'blue'),
('khao_kheow_ac', 18, 4, 18, 490, 'blue');

-- Course A - Yellow Tees (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_ac', 1, 4, 1, 298, 'yellow'),
('khao_kheow_ac', 2, 5, 2, 533, 'yellow'),
('khao_kheow_ac', 3, 3, 3, 184, 'yellow'),
('khao_kheow_ac', 4, 4, 4, 417, 'yellow'),
('khao_kheow_ac', 5, 3, 5, 132, 'yellow'),
('khao_kheow_ac', 6, 4, 6, 384, 'yellow'),
('khao_kheow_ac', 7, 4, 7, 296, 'yellow'),
('khao_kheow_ac', 8, 5, 8, 459, 'yellow'),
('khao_kheow_ac', 9, 4, 9, 404, 'yellow');

-- Course C - Yellow Tees (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_ac', 10, 5, 10, 525, 'yellow'),
('khao_kheow_ac', 11, 4, 11, 395, 'yellow'),
('khao_kheow_ac', 12, 3, 12, 167, 'yellow'),
('khao_kheow_ac', 13, 4, 13, 368, 'yellow'),
('khao_kheow_ac', 14, 4, 14, 384, 'yellow'),
('khao_kheow_ac', 15, 4, 15, 382, 'yellow'),
('khao_kheow_ac', 16, 5, 16, 511, 'yellow'),
('khao_kheow_ac', 17, 3, 17, 165, 'yellow'),
('khao_kheow_ac', 18, 4, 18, 337, 'yellow');

-- Course A - White Tees (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_ac', 1, 4, 1, 269, 'white'),
('khao_kheow_ac', 2, 5, 2, 489, 'white'),
('khao_kheow_ac', 3, 3, 3, 164, 'white'),
('khao_kheow_ac', 4, 4, 4, 387, 'white'),
('khao_kheow_ac', 5, 3, 5, 122, 'white'),
('khao_kheow_ac', 6, 4, 6, 347, 'white'),
('khao_kheow_ac', 7, 4, 7, 262, 'white'),
('khao_kheow_ac', 8, 5, 8, 408, 'white'),
('khao_kheow_ac', 9, 4, 9, 373, 'white');

-- Course C - White Tees (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_ac', 10, 5, 10, 418, 'white'),
('khao_kheow_ac', 11, 4, 11, 383, 'white'),
('khao_kheow_ac', 12, 3, 12, 138, 'white'),
('khao_kheow_ac', 13, 4, 13, 332, 'white'),
('khao_kheow_ac', 14, 4, 14, 363, 'white'),
('khao_kheow_ac', 15, 4, 15, 366, 'white'),
('khao_kheow_ac', 16, 5, 16, 493, 'white'),
('khao_kheow_ac', 17, 3, 17, 157, 'white'),
('khao_kheow_ac', 18, 4, 18, 318, 'white');

-- Course A - Red Tees (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_ac', 1, 4, 1, 237, 'red'),
('khao_kheow_ac', 2, 5, 2, 443, 'red'),
('khao_kheow_ac', 3, 3, 3, 123, 'red'),
('khao_kheow_ac', 4, 4, 4, 329, 'red'),
('khao_kheow_ac', 5, 3, 5, 93, 'red'),
('khao_kheow_ac', 6, 4, 6, 309, 'red'),
('khao_kheow_ac', 7, 4, 7, 239, 'red'),
('khao_kheow_ac', 8, 5, 8, 347, 'red'),
('khao_kheow_ac', 9, 4, 9, 331, 'red');

-- Course C - Red Tees (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_ac', 10, 5, 10, 406, 'red'),
('khao_kheow_ac', 11, 4, 11, 343, 'red'),
('khao_kheow_ac', 12, 3, 12, 107, 'red'),
('khao_kheow_ac', 13, 4, 13, 287, 'red'),
('khao_kheow_ac', 14, 4, 14, 306, 'red'),
('khao_kheow_ac', 15, 4, 15, 297, 'red'),
('khao_kheow_ac', 16, 5, 16, 447, 'red'),
('khao_kheow_ac', 17, 3, 17, 127, 'red'),
('khao_kheow_ac', 18, 4, 18, 268, 'red');

-- =====================================================================
-- COURSE COMBINATION 3: Khao Kheow B+C (khao_kheow_bc)
-- Course B (Holes 1-9) + Course C (Holes 10-18)
-- =====================================================================

-- Course B - Blue Tees (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_bc', 1, 4, 1, 430, 'blue'),
('khao_kheow_bc', 2, 5, 2, 553, 'blue'),
('khao_kheow_bc', 3, 3, 3, 199, 'blue'),
('khao_kheow_bc', 4, 4, 4, 426, 'blue'),
('khao_kheow_bc', 5, 4, 5, 375, 'blue'),
('khao_kheow_bc', 6, 5, 6, 560, 'blue'),
('khao_kheow_bc', 7, 4, 7, 465, 'blue'),
('khao_kheow_bc', 8, 3, 8, 146, 'blue'),
('khao_kheow_bc', 9, 4, 9, 430, 'blue');

-- Course C - Blue Tees (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_bc', 10, 5, 10, 550, 'blue'),
('khao_kheow_bc', 11, 4, 11, 442, 'blue'),
('khao_kheow_bc', 12, 3, 12, 184, 'blue'),
('khao_kheow_bc', 13, 4, 13, 378, 'blue'),
('khao_kheow_bc', 14, 4, 14, 398, 'blue'),
('khao_kheow_bc', 15, 4, 15, 402, 'blue'),
('khao_kheow_bc', 16, 5, 16, 556, 'blue'),
('khao_kheow_bc', 17, 3, 17, 180, 'blue'),
('khao_kheow_bc', 18, 4, 18, 490, 'blue');

-- Course B - Yellow Tees (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_bc', 1, 4, 1, 371, 'yellow'),
('khao_kheow_bc', 2, 5, 2, 526, 'yellow'),
('khao_kheow_bc', 3, 3, 3, 168, 'yellow'),
('khao_kheow_bc', 4, 4, 4, 382, 'yellow'),
('khao_kheow_bc', 5, 4, 5, 340, 'yellow'),
('khao_kheow_bc', 6, 5, 6, 510, 'yellow'),
('khao_kheow_bc', 7, 4, 7, 424, 'yellow'),
('khao_kheow_bc', 8, 3, 8, 128, 'yellow'),
('khao_kheow_bc', 9, 4, 9, 403, 'yellow');

-- Course C - Yellow Tees (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_bc', 10, 5, 10, 525, 'yellow'),
('khao_kheow_bc', 11, 4, 11, 395, 'yellow'),
('khao_kheow_bc', 12, 3, 12, 167, 'yellow'),
('khao_kheow_bc', 13, 4, 13, 368, 'yellow'),
('khao_kheow_bc', 14, 4, 14, 384, 'yellow'),
('khao_kheow_bc', 15, 4, 15, 382, 'yellow'),
('khao_kheow_bc', 16, 5, 16, 511, 'yellow'),
('khao_kheow_bc', 17, 3, 17, 165, 'yellow'),
('khao_kheow_bc', 18, 4, 18, 337, 'yellow');

-- Course B - White Tees (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_bc', 1, 4, 1, 327, 'white'),
('khao_kheow_bc', 2, 5, 2, 490, 'white'),
('khao_kheow_bc', 3, 3, 3, 155, 'white'),
('khao_kheow_bc', 4, 4, 4, 336, 'white'),
('khao_kheow_bc', 5, 4, 5, 306, 'white'),
('khao_kheow_bc', 6, 5, 6, 458, 'white'),
('khao_kheow_bc', 7, 4, 7, 389, 'white'),
('khao_kheow_bc', 8, 3, 8, 124, 'white'),
('khao_kheow_bc', 9, 4, 9, 366, 'white');

-- Course C - White Tees (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_bc', 10, 5, 10, 418, 'white'),
('khao_kheow_bc', 11, 4, 11, 383, 'white'),
('khao_kheow_bc', 12, 3, 12, 138, 'white'),
('khao_kheow_bc', 13, 4, 13, 332, 'white'),
('khao_kheow_bc', 14, 4, 14, 363, 'white'),
('khao_kheow_bc', 15, 4, 15, 366, 'white'),
('khao_kheow_bc', 16, 5, 16, 493, 'white'),
('khao_kheow_bc', 17, 3, 17, 157, 'white'),
('khao_kheow_bc', 18, 4, 18, 318, 'white');

-- Course B - Red Tees (Holes 1-9)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_bc', 1, 4, 1, 311, 'red'),
('khao_kheow_bc', 2, 5, 2, 449, 'red'),
('khao_kheow_bc', 3, 3, 3, 125, 'red'),
('khao_kheow_bc', 4, 4, 4, 285, 'red'),
('khao_kheow_bc', 5, 4, 5, 295, 'red'),
('khao_kheow_bc', 6, 5, 6, 413, 'red'),
('khao_kheow_bc', 7, 4, 7, 319, 'red'),
('khao_kheow_bc', 8, 3, 8, 104, 'red'),
('khao_kheow_bc', 9, 4, 9, 307, 'red');

-- Course C - Red Tees (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('khao_kheow_bc', 10, 5, 10, 406, 'red'),
('khao_kheow_bc', 11, 4, 11, 343, 'red'),
('khao_kheow_bc', 12, 3, 12, 107, 'red'),
('khao_kheow_bc', 13, 4, 13, 287, 'red'),
('khao_kheow_bc', 14, 4, 14, 306, 'red'),
('khao_kheow_bc', 15, 4, 15, 297, 'red'),
('khao_kheow_bc', 16, 5, 16, 447, 'red'),
('khao_kheow_bc', 17, 3, 17, 127, 'red'),
('khao_kheow_bc', 18, 4, 18, 268, 'red');

-- =====================================================================
-- VERIFICATION QUERIES
-- =====================================================================

-- Verify hole counts for each course (should be 72 holes each: 18 holes x 4 tee markers)
SELECT
    course_id,
    COUNT(*) as total_holes,
    SUM(CASE WHEN tee_marker = 'blue' THEN 1 ELSE 0 END) as blue_tees,
    SUM(CASE WHEN tee_marker = 'yellow' THEN 1 ELSE 0 END) as yellow_tees,
    SUM(CASE WHEN tee_marker = 'white' THEN 1 ELSE 0 END) as white_tees,
    SUM(CASE WHEN tee_marker = 'red' THEN 1 ELSE 0 END) as red_tees
FROM course_holes
WHERE course_id LIKE 'khao_kheow_%'
GROUP BY course_id
ORDER BY course_id;

-- Verify total yardages for each course and tee marker
SELECT
    course_id,
    tee_marker,
    SUM(yardage) as total_yardage,
    COUNT(*) as hole_count
FROM course_holes
WHERE course_id LIKE 'khao_kheow_%'
GROUP BY course_id, tee_marker
ORDER BY course_id, tee_marker;

-- =====================================================================
-- SUCCESS MESSAGE
-- =====================================================================

SELECT '
=====================================================================
KHAO KHEOW COUNTRY CLUB - TEE MARKER UPDATE COMPLETE
=====================================================================

All tee markers have been successfully updated for all three 18-hole combinations:

KHAO KHEOW A+B (khao_kheow_ab):
  - Blue Tees:   7,077 yards (3,493 + 3,584)
  - Yellow Tees: 6,359 yards (3,107 + 3,252)
  - White Tees:  5,772 yards (2,821 + 2,951)
  - Red Tees:    5,059 yards (2,451 + 2,608)

KHAO KHEOW A+C (khao_kheow_ac):
  - Blue Tees:   7,073 yards (3,493 + 3,580)
  - Yellow Tees: 6,341 yards (3,107 + 3,234)
  - White Tees:  5,789 yards (2,821 + 2,968)
  - Red Tees:    5,039 yards (2,451 + 2,588)

KHAO KHEOW B+C (khao_kheow_bc):
  - Blue Tees:   7,164 yards (3,584 + 3,580)
  - Yellow Tees: 6,486 yards (3,252 + 3,234)
  - White Tees:  5,919 yards (2,951 + 2,968)
  - Red Tees:    5,196 yards (2,608 + 2,588)

Total: 216 hole records (72 per course combination)
All 4 tee markers (blue, yellow, white, red) for all 18 holes per combination
=====================================================================
' as status;
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
-- ============================================================================
-- Mountain Shadow Golf Club - Complete Tee Marker Data Fix
-- ============================================================================
-- This script removes all existing hole data for Mountain Shadow Golf Club
-- and inserts complete, accurate data for ALL tee markers from the scorecard
-- ============================================================================

-- Clean up existing data
DELETE FROM course_holes WHERE course_id = 'mountain_shadow';

-- ============================================================================
-- BLACK TEES (Total: 6722 yards)
-- ============================================================================

-- Front Nine (OUT: 3460 yards)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('mountain_shadow', 1, 4, 11, 407, 'black'),
('mountain_shadow', 2, 4, 7, 395, 'black'),
('mountain_shadow', 3, 5, 5, 561, 'black'),
('mountain_shadow', 4, 4, 13, 376, 'black'),
('mountain_shadow', 5, 3, 17, 150, 'black'),
('mountain_shadow', 6, 5, 3, 561, 'black'),
('mountain_shadow', 7, 4, 1, 420, 'black'),
('mountain_shadow', 8, 3, 15, 194, 'black'),
('mountain_shadow', 9, 4, 9, 396, 'black');

-- Back Nine (IN: 3262 yards)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('mountain_shadow', 10, 4, 14, 356, 'black'),
('mountain_shadow', 11, 5, 10, 483, 'black'),
('mountain_shadow', 12, 4, 8, 370, 'black'),
('mountain_shadow', 13, 4, 4, 403, 'black'),
('mountain_shadow', 14, 5, 2, 577, 'black'),
('mountain_shadow', 15, 3, 16, 151, 'black'),
('mountain_shadow', 16, 4, 18, 323, 'black'),
('mountain_shadow', 17, 3, 12, 189, 'black'),
('mountain_shadow', 18, 4, 6, 410, 'black');

-- ============================================================================
-- BLUE TEES (Total: 6276 yards)
-- ============================================================================

-- Front Nine (OUT: 3225 yards)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('mountain_shadow', 1, 4, 11, 379, 'blue'),
('mountain_shadow', 2, 4, 7, 374, 'blue'),
('mountain_shadow', 3, 5, 5, 531, 'blue'),
('mountain_shadow', 4, 4, 13, 343, 'blue'),
('mountain_shadow', 5, 3, 17, 127, 'blue'),
('mountain_shadow', 6, 5, 3, 546, 'blue'),
('mountain_shadow', 7, 4, 1, 393, 'blue'),
('mountain_shadow', 8, 3, 15, 161, 'blue'),
('mountain_shadow', 9, 4, 9, 371, 'blue');

-- Back Nine (IN: 3051 yards)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('mountain_shadow', 10, 4, 14, 324, 'blue'),
('mountain_shadow', 11, 5, 10, 458, 'blue'),
('mountain_shadow', 12, 4, 8, 342, 'blue'),
('mountain_shadow', 13, 4, 4, 385, 'blue'),
('mountain_shadow', 14, 5, 2, 549, 'blue'),
('mountain_shadow', 15, 3, 16, 149, 'blue'),
('mountain_shadow', 16, 4, 18, 305, 'blue'),
('mountain_shadow', 17, 3, 12, 165, 'blue'),
('mountain_shadow', 18, 4, 6, 374, 'blue');

-- ============================================================================
-- WHITE TEES (Total: 5838 yards)
-- ============================================================================

-- Front Nine (OUT: 2990 yards)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('mountain_shadow', 1, 4, 11, 354, 'white'),
('mountain_shadow', 2, 4, 7, 351, 'white'),
('mountain_shadow', 3, 5, 5, 508, 'white'),
('mountain_shadow', 4, 4, 13, 308, 'white'),
('mountain_shadow', 5, 3, 17, 103, 'white'),
('mountain_shadow', 6, 5, 3, 524, 'white'),
('mountain_shadow', 7, 4, 1, 380, 'white'),
('mountain_shadow', 8, 3, 15, 121, 'white'),
('mountain_shadow', 9, 4, 9, 341, 'white');

-- Back Nine (IN: 2848 yards)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('mountain_shadow', 10, 4, 14, 307, 'white'),
('mountain_shadow', 11, 5, 10, 437, 'white'),
('mountain_shadow', 12, 4, 8, 312, 'white'),
('mountain_shadow', 13, 4, 4, 355, 'white'),
('mountain_shadow', 14, 5, 2, 533, 'white'),
('mountain_shadow', 15, 3, 16, 143, 'white'),
('mountain_shadow', 16, 4, 18, 270, 'white'),
('mountain_shadow', 17, 3, 12, 150, 'white'),
('mountain_shadow', 18, 4, 6, 341, 'white');

-- ============================================================================
-- RED TEES (Total: 5041 yards)
-- ============================================================================

-- Front Nine (OUT: 2617 yards)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('mountain_shadow', 1, 4, 11, 306, 'red'),
('mountain_shadow', 2, 4, 7, 299, 'red'),
('mountain_shadow', 3, 5, 5, 456, 'red'),
('mountain_shadow', 4, 4, 13, 262, 'red'),
('mountain_shadow', 5, 3, 17, 75, 'red'),
('mountain_shadow', 6, 5, 3, 476, 'red'),
('mountain_shadow', 7, 4, 1, 345, 'red'),
('mountain_shadow', 8, 3, 15, 95, 'red'),
('mountain_shadow', 9, 4, 9, 303, 'red');

-- Back Nine (IN: 2404 yards)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('mountain_shadow', 10, 4, 14, 248, 'red'),
('mountain_shadow', 11, 5, 10, 384, 'red'),
('mountain_shadow', 12, 4, 8, 267, 'red'),
('mountain_shadow', 13, 4, 4, 294, 'red'),
('mountain_shadow', 14, 5, 2, 437, 'red'),
('mountain_shadow', 15, 3, 16, 117, 'red'),
('mountain_shadow', 16, 4, 18, 230, 'red'),
('mountain_shadow', 17, 3, 12, 113, 'red'),
('mountain_shadow', 18, 4, 6, 314, 'red');

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check total holes inserted (should be 72: 4 tee markers x 18 holes)
SELECT
    'Total Holes Check' as verification,
    COUNT(*) as total_holes,
    CASE WHEN COUNT(*) = 72 THEN 'PASS' ELSE 'FAIL' END as status
FROM course_holes
WHERE course_id = 'mountain_shadow';

-- Verify yardage totals by tee marker
SELECT
    tee_marker,
    SUM(CASE WHEN hole_number <= 9 THEN yardage ELSE 0 END) as out_yardage,
    SUM(CASE WHEN hole_number > 9 THEN yardage ELSE 0 END) as in_yardage,
    SUM(yardage) as total_yardage,
    SUM(par) as total_par
FROM course_holes
WHERE course_id = 'mountain_shadow'
GROUP BY tee_marker
ORDER BY total_yardage DESC;

-- Verify all holes are present for each tee marker
SELECT
    tee_marker,
    COUNT(*) as hole_count,
    CASE WHEN COUNT(*) = 18 THEN 'PASS' ELSE 'FAIL' END as status
FROM course_holes
WHERE course_id = 'mountain_shadow'
GROUP BY tee_marker
ORDER BY tee_marker;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT '
=============================================================================
  MOUNTAIN SHADOW GOLF CLUB - DATA IMPORT COMPLETE
=============================================================================

  Course: Mountain Shadow Golf Club
  Total Holes: 72 (4 tee markers x 18 holes)

  TEE MARKER TOTALS:
  ------------------
  BLACK TEES:  6,722 yards (Par 72)
  BLUE TEES:   6,276 yards (Par 72)
  WHITE TEES:  5,838 yards (Par 72)
  RED TEES:    5,041 yards (Par 72)

  All yardages verified against official scorecard.

=============================================================================
' as message;
-- =====================================================
-- Pattana Golf Resort & Spa - All Course Combinations
-- =====================================================
-- This script creates 3 separate 18-hole course combinations from 3 nine-hole courses:
-- 1. ANDREAS (9 holes)
-- 2. BROOKEL (9 holes)
-- 3. CALYPSO (9 holes)
--
-- Course Combinations:
-- 1. pattana_andreas_brookel: ANDREAS (holes 1-9) + BROOKEL (holes 10-18)
-- 2. pattana_andreas_calypso: ANDREAS (holes 1-9) + CALYPSO (holes 10-18)
-- 3. pattana_brookel_calypso: BROOKEL (holes 1-9) + CALYPSO (holes 10-18)
--
-- Each combination has 4 tee markers:
-- - Blue Tees (Championship)
-- - White Tees (Men's Regular)
-- - Yellow Tees (Senior/Forward)
-- - Red Tees (Ladies)
-- =====================================================

-- Delete existing data for all Pattana course combinations
DELETE FROM course_holes WHERE course_id IN ('pattana_andreas_brookel', 'pattana_andreas_calypso', 'pattana_brookel_calypso');

-- =====================================================
-- COMBINATION 1: ANDREAS + BROOKEL
-- =====================================================

-- BLUE TEES - ANDREAS (Holes 1-9) + BROOKEL (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- ANDREAS Front 9
('pattana_andreas_brookel', 1, 5, 6, 627, 'Blue'),
('pattana_andreas_brookel', 2, 3, 9, 325, 'Blue'),
('pattana_andreas_brookel', 3, 4, 6, 170, 'Blue'),
('pattana_andreas_brookel', 4, 4, 1, 450, 'Blue'),
('pattana_andreas_brookel', 5, 4, 7, 459, 'Blue'),
('pattana_andreas_brookel', 6, 4, 4, 391, 'Blue'),
('pattana_andreas_brookel', 7, 4, 5, 410, 'Blue'),
('pattana_andreas_brookel', 8, 3, 3, 190, 'Blue'),
('pattana_andreas_brookel', 9, 4, 2, 460, 'Blue'),
-- BROOKEL Back 9
('pattana_andreas_brookel', 10, 4, 2, 438, 'Blue'),
('pattana_andreas_brookel', 11, 5, 7, 535, 'Blue'),
('pattana_andreas_brookel', 12, 3, 8, 183, 'Blue'),
('pattana_andreas_brookel', 13, 4, 3, 398, 'Blue'),
('pattana_andreas_brookel', 14, 5, 9, 558, 'Blue'),
('pattana_andreas_brookel', 15, 4, 6, 409, 'Blue'),
('pattana_andreas_brookel', 16, 4, 4, 408, 'Blue'),
('pattana_andreas_brookel', 17, 5, 1, 500, 'Blue'),
('pattana_andreas_brookel', 18, 5, 5, 685, 'Blue');

-- WHITE TEES - ANDREAS (Holes 1-9) + BROOKEL (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- ANDREAS Front 9
('pattana_andreas_brookel', 1, 5, 6, 408, 'White'),
('pattana_andreas_brookel', 2, 3, 9, 470, 'White'),
('pattana_andreas_brookel', 3, 4, 6, 113, 'White'),
('pattana_andreas_brookel', 4, 4, 1, 431, 'White'),
('pattana_andreas_brookel', 5, 4, 7, 407, 'White'),
('pattana_andreas_brookel', 6, 4, 4, 357, 'White'),
('pattana_andreas_brookel', 7, 4, 5, 387, 'White'),
('pattana_andreas_brookel', 8, 3, 3, 177, 'White'),
('pattana_andreas_brookel', 9, 4, 2, 442, 'White'),
-- BROOKEL Back 9
('pattana_andreas_brookel', 10, 4, 2, 427, 'White'),
('pattana_andreas_brookel', 11, 5, 7, 503, 'White'),
('pattana_andreas_brookel', 12, 3, 8, 161, 'White'),
('pattana_andreas_brookel', 13, 4, 3, 373, 'White'),
('pattana_andreas_brookel', 14, 5, 9, 517, 'White'),
('pattana_andreas_brookel', 15, 4, 6, 378, 'White'),
('pattana_andreas_brookel', 16, 4, 4, 186, 'White'),
('pattana_andreas_brookel', 17, 5, 1, 474, 'White'),
('pattana_andreas_brookel', 18, 5, 5, 577, 'White');

-- YELLOW TEES - ANDREAS (Holes 1-9) + BROOKEL (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- ANDREAS Front 9
('pattana_andreas_brookel', 1, 5, 6, 389, 'Yellow'),
('pattana_andreas_brookel', 2, 3, 9, 452, 'Yellow'),
('pattana_andreas_brookel', 3, 4, 6, 108, 'Yellow'),
('pattana_andreas_brookel', 4, 4, 1, 414, 'Yellow'),
('pattana_andreas_brookel', 5, 4, 7, 380, 'Yellow'),
('pattana_andreas_brookel', 6, 4, 4, 340, 'Yellow'),
('pattana_andreas_brookel', 7, 4, 5, 360, 'Yellow'),
('pattana_andreas_brookel', 8, 3, 3, 167, 'Yellow'),
('pattana_andreas_brookel', 9, 4, 2, 435, 'Yellow'),
-- BROOKEL Back 9
('pattana_andreas_brookel', 10, 4, 2, 411, 'Yellow'),
('pattana_andreas_brookel', 11, 5, 7, 483, 'Yellow'),
('pattana_andreas_brookel', 12, 3, 8, 150, 'Yellow'),
('pattana_andreas_brookel', 13, 4, 3, 353, 'Yellow'),
('pattana_andreas_brookel', 14, 5, 9, 502, 'Yellow'),
('pattana_andreas_brookel', 15, 4, 6, 360, 'Yellow'),
('pattana_andreas_brookel', 16, 4, 4, 169, 'Yellow'),
('pattana_andreas_brookel', 17, 5, 1, 450, 'Yellow'),
('pattana_andreas_brookel', 18, 5, 5, 564, 'Yellow');

-- RED TEES - ANDREAS (Holes 1-9) + BROOKEL (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- ANDREAS Front 9
('pattana_andreas_brookel', 1, 5, 6, 369, 'Red'),
('pattana_andreas_brookel', 2, 3, 9, 430, 'Red'),
('pattana_andreas_brookel', 3, 4, 6, 93, 'Red'),
('pattana_andreas_brookel', 4, 4, 1, 398, 'Red'),
('pattana_andreas_brookel', 5, 4, 7, 362, 'Red'),
('pattana_andreas_brookel', 6, 4, 4, 320, 'Red'),
('pattana_andreas_brookel', 7, 4, 5, 342, 'Red'),
('pattana_andreas_brookel', 8, 3, 3, 150, 'Red'),
('pattana_andreas_brookel', 9, 4, 2, 418, 'Red'),
-- BROOKEL Back 9
('pattana_andreas_brookel', 10, 4, 2, 392, 'Red'),
('pattana_andreas_brookel', 11, 5, 7, 462, 'Red'),
('pattana_andreas_brookel', 12, 3, 8, 140, 'Red'),
('pattana_andreas_brookel', 13, 4, 3, 340, 'Red'),
('pattana_andreas_brookel', 14, 5, 9, 486, 'Red'),
('pattana_andreas_brookel', 15, 4, 6, 341, 'Red'),
('pattana_andreas_brookel', 16, 4, 4, 154, 'Red'),
('pattana_andreas_brookel', 17, 5, 1, 428, 'Red'),
('pattana_andreas_brookel', 18, 5, 5, 548, 'Red');

-- =====================================================
-- COMBINATION 2: ANDREAS + CALYPSO
-- =====================================================

-- BLUE TEES - ANDREAS (Holes 1-9) + CALYPSO (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- ANDREAS Front 9
('pattana_andreas_calypso', 1, 5, 6, 627, 'Blue'),
('pattana_andreas_calypso', 2, 3, 9, 325, 'Blue'),
('pattana_andreas_calypso', 3, 4, 6, 170, 'Blue'),
('pattana_andreas_calypso', 4, 4, 1, 450, 'Blue'),
('pattana_andreas_calypso', 5, 4, 7, 459, 'Blue'),
('pattana_andreas_calypso', 6, 4, 4, 391, 'Blue'),
('pattana_andreas_calypso', 7, 4, 5, 410, 'Blue'),
('pattana_andreas_calypso', 8, 3, 3, 190, 'Blue'),
('pattana_andreas_calypso', 9, 4, 2, 460, 'Blue'),
-- CALYPSO Back 9
('pattana_andreas_calypso', 10, 4, 4, 388, 'Blue'),
('pattana_andreas_calypso', 11, 3, 8, 144, 'Blue'),
('pattana_andreas_calypso', 12, 5, 9, 540, 'Blue'),
('pattana_andreas_calypso', 13, 4, 2, 418, 'Blue'),
('pattana_andreas_calypso', 14, 4, 3, 430, 'Blue'),
('pattana_andreas_calypso', 15, 4, 1, 407, 'Blue'),
('pattana_andreas_calypso', 16, 3, 6, 193, 'Blue'),
('pattana_andreas_calypso', 17, 5, 7, 577, 'Blue'),
('pattana_andreas_calypso', 18, 4, 5, 422, 'Blue');

-- WHITE TEES - ANDREAS (Holes 1-9) + CALYPSO (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- ANDREAS Front 9
('pattana_andreas_calypso', 1, 5, 6, 408, 'White'),
('pattana_andreas_calypso', 2, 3, 9, 470, 'White'),
('pattana_andreas_calypso', 3, 4, 6, 113, 'White'),
('pattana_andreas_calypso', 4, 4, 1, 431, 'White'),
('pattana_andreas_calypso', 5, 4, 7, 407, 'White'),
('pattana_andreas_calypso', 6, 4, 4, 357, 'White'),
('pattana_andreas_calypso', 7, 4, 5, 387, 'White'),
('pattana_andreas_calypso', 8, 3, 3, 177, 'White'),
('pattana_andreas_calypso', 9, 4, 2, 442, 'White'),
-- CALYPSO Back 9
('pattana_andreas_calypso', 10, 4, 4, 365, 'White'),
('pattana_andreas_calypso', 11, 3, 8, 126, 'White'),
('pattana_andreas_calypso', 12, 5, 9, 507, 'White'),
('pattana_andreas_calypso', 13, 4, 2, 396, 'White'),
('pattana_andreas_calypso', 14, 4, 3, 381, 'White'),
('pattana_andreas_calypso', 15, 4, 1, 386, 'White'),
('pattana_andreas_calypso', 16, 3, 6, 175, 'White'),
('pattana_andreas_calypso', 17, 5, 7, 545, 'White'),
('pattana_andreas_calypso', 18, 4, 5, 392, 'White');

-- YELLOW TEES - ANDREAS (Holes 1-9) + CALYPSO (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- ANDREAS Front 9
('pattana_andreas_calypso', 1, 5, 6, 389, 'Yellow'),
('pattana_andreas_calypso', 2, 3, 9, 452, 'Yellow'),
('pattana_andreas_calypso', 3, 4, 6, 108, 'Yellow'),
('pattana_andreas_calypso', 4, 4, 1, 414, 'Yellow'),
('pattana_andreas_calypso', 5, 4, 7, 380, 'Yellow'),
('pattana_andreas_calypso', 6, 4, 4, 340, 'Yellow'),
('pattana_andreas_calypso', 7, 4, 5, 360, 'Yellow'),
('pattana_andreas_calypso', 8, 3, 3, 167, 'Yellow'),
('pattana_andreas_calypso', 9, 4, 2, 435, 'Yellow'),
-- CALYPSO Back 9
('pattana_andreas_calypso', 10, 4, 4, 343, 'Yellow'),
('pattana_andreas_calypso', 11, 3, 8, 109, 'Yellow'),
('pattana_andreas_calypso', 12, 5, 9, 495, 'Yellow'),
('pattana_andreas_calypso', 13, 4, 2, 372, 'Yellow'),
('pattana_andreas_calypso', 14, 4, 3, 361, 'Yellow'),
('pattana_andreas_calypso', 15, 4, 1, 383, 'Yellow'),
('pattana_andreas_calypso', 16, 3, 6, 154, 'Yellow'),
('pattana_andreas_calypso', 17, 5, 7, 526, 'Yellow'),
('pattana_andreas_calypso', 18, 4, 5, 363, 'Yellow');

-- RED TEES - ANDREAS (Holes 1-9) + CALYPSO (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- ANDREAS Front 9
('pattana_andreas_calypso', 1, 5, 6, 369, 'Red'),
('pattana_andreas_calypso', 2, 3, 9, 430, 'Red'),
('pattana_andreas_calypso', 3, 4, 6, 93, 'Red'),
('pattana_andreas_calypso', 4, 4, 1, 398, 'Red'),
('pattana_andreas_calypso', 5, 4, 7, 362, 'Red'),
('pattana_andreas_calypso', 6, 4, 4, 320, 'Red'),
('pattana_andreas_calypso', 7, 4, 5, 342, 'Red'),
('pattana_andreas_calypso', 8, 3, 3, 150, 'Red'),
('pattana_andreas_calypso', 9, 4, 2, 418, 'Red'),
-- CALYPSO Back 9
('pattana_andreas_calypso', 10, 4, 4, 328, 'Red'),
('pattana_andreas_calypso', 11, 3, 8, 95, 'Red'),
('pattana_andreas_calypso', 12, 5, 9, 480, 'Red'),
('pattana_andreas_calypso', 13, 4, 2, 356, 'Red'),
('pattana_andreas_calypso', 14, 4, 3, 345, 'Red'),
('pattana_andreas_calypso', 15, 4, 1, 368, 'Red'),
('pattana_andreas_calypso', 16, 3, 6, 139, 'Red'),
('pattana_andreas_calypso', 17, 5, 7, 508, 'Red'),
('pattana_andreas_calypso', 18, 4, 5, 345, 'Red');

-- =====================================================
-- COMBINATION 3: BROOKEL + CALYPSO
-- =====================================================

-- BLUE TEES - BROOKEL (Holes 1-9) + CALYPSO (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- BROOKEL Front 9
('pattana_brookel_calypso', 1, 4, 2, 438, 'Blue'),
('pattana_brookel_calypso', 2, 5, 7, 535, 'Blue'),
('pattana_brookel_calypso', 3, 3, 8, 183, 'Blue'),
('pattana_brookel_calypso', 4, 4, 3, 398, 'Blue'),
('pattana_brookel_calypso', 5, 5, 9, 558, 'Blue'),
('pattana_brookel_calypso', 6, 4, 6, 409, 'Blue'),
('pattana_brookel_calypso', 7, 4, 4, 408, 'Blue'),
('pattana_brookel_calypso', 8, 5, 1, 500, 'Blue'),
('pattana_brookel_calypso', 9, 5, 5, 685, 'Blue'),
-- CALYPSO Back 9
('pattana_brookel_calypso', 10, 4, 4, 388, 'Blue'),
('pattana_brookel_calypso', 11, 3, 8, 144, 'Blue'),
('pattana_brookel_calypso', 12, 5, 9, 540, 'Blue'),
('pattana_brookel_calypso', 13, 4, 2, 418, 'Blue'),
('pattana_brookel_calypso', 14, 4, 3, 430, 'Blue'),
('pattana_brookel_calypso', 15, 4, 1, 407, 'Blue'),
('pattana_brookel_calypso', 16, 3, 6, 193, 'Blue'),
('pattana_brookel_calypso', 17, 5, 7, 577, 'Blue'),
('pattana_brookel_calypso', 18, 4, 5, 422, 'Blue');

-- WHITE TEES - BROOKEL (Holes 1-9) + CALYPSO (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- BROOKEL Front 9
('pattana_brookel_calypso', 1, 4, 2, 427, 'White'),
('pattana_brookel_calypso', 2, 5, 7, 503, 'White'),
('pattana_brookel_calypso', 3, 3, 8, 161, 'White'),
('pattana_brookel_calypso', 4, 4, 3, 373, 'White'),
('pattana_brookel_calypso', 5, 5, 9, 517, 'White'),
('pattana_brookel_calypso', 6, 4, 6, 378, 'White'),
('pattana_brookel_calypso', 7, 4, 4, 186, 'White'),
('pattana_brookel_calypso', 8, 5, 1, 474, 'White'),
('pattana_brookel_calypso', 9, 5, 5, 577, 'White'),
-- CALYPSO Back 9
('pattana_brookel_calypso', 10, 4, 4, 365, 'White'),
('pattana_brookel_calypso', 11, 3, 8, 126, 'White'),
('pattana_brookel_calypso', 12, 5, 9, 507, 'White'),
('pattana_brookel_calypso', 13, 4, 2, 396, 'White'),
('pattana_brookel_calypso', 14, 4, 3, 381, 'White'),
('pattana_brookel_calypso', 15, 4, 1, 386, 'White'),
('pattana_brookel_calypso', 16, 3, 6, 175, 'White'),
('pattana_brookel_calypso', 17, 5, 7, 545, 'White'),
('pattana_brookel_calypso', 18, 4, 5, 392, 'White');

-- YELLOW TEES - BROOKEL (Holes 1-9) + CALYPSO (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- BROOKEL Front 9
('pattana_brookel_calypso', 1, 4, 2, 411, 'Yellow'),
('pattana_brookel_calypso', 2, 5, 7, 483, 'Yellow'),
('pattana_brookel_calypso', 3, 3, 8, 150, 'Yellow'),
('pattana_brookel_calypso', 4, 4, 3, 353, 'Yellow'),
('pattana_brookel_calypso', 5, 5, 9, 502, 'Yellow'),
('pattana_brookel_calypso', 6, 4, 6, 360, 'Yellow'),
('pattana_brookel_calypso', 7, 4, 4, 169, 'Yellow'),
('pattana_brookel_calypso', 8, 5, 1, 450, 'Yellow'),
('pattana_brookel_calypso', 9, 5, 5, 564, 'Yellow'),
-- CALYPSO Back 9
('pattana_brookel_calypso', 10, 4, 4, 343, 'Yellow'),
('pattana_brookel_calypso', 11, 3, 8, 109, 'Yellow'),
('pattana_brookel_calypso', 12, 5, 9, 495, 'Yellow'),
('pattana_brookel_calypso', 13, 4, 2, 372, 'Yellow'),
('pattana_brookel_calypso', 14, 4, 3, 361, 'Yellow'),
('pattana_brookel_calypso', 15, 4, 1, 383, 'Yellow'),
('pattana_brookel_calypso', 16, 3, 6, 154, 'Yellow'),
('pattana_brookel_calypso', 17, 5, 7, 526, 'Yellow'),
('pattana_brookel_calypso', 18, 4, 5, 363, 'Yellow');

-- RED TEES - BROOKEL (Holes 1-9) + CALYPSO (Holes 10-18)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- BROOKEL Front 9
('pattana_brookel_calypso', 1, 4, 2, 392, 'Red'),
('pattana_brookel_calypso', 2, 5, 7, 462, 'Red'),
('pattana_brookel_calypso', 3, 3, 8, 140, 'Red'),
('pattana_brookel_calypso', 4, 4, 3, 340, 'Red'),
('pattana_brookel_calypso', 5, 5, 9, 486, 'Red'),
('pattana_brookel_calypso', 6, 4, 6, 341, 'Red'),
('pattana_brookel_calypso', 7, 4, 4, 154, 'Red'),
('pattana_brookel_calypso', 8, 5, 1, 428, 'Red'),
('pattana_brookel_calypso', 9, 5, 5, 548, 'Red'),
-- CALYPSO Back 9
('pattana_brookel_calypso', 10, 4, 4, 328, 'Red'),
('pattana_brookel_calypso', 11, 3, 8, 95, 'Red'),
('pattana_brookel_calypso', 12, 5, 9, 480, 'Red'),
('pattana_brookel_calypso', 13, 4, 2, 356, 'Red'),
('pattana_brookel_calypso', 14, 4, 3, 345, 'Red'),
('pattana_brookel_calypso', 15, 4, 1, 368, 'Red'),
('pattana_brookel_calypso', 16, 3, 6, 139, 'Red'),
('pattana_brookel_calypso', 17, 5, 7, 508, 'Red'),
('pattana_brookel_calypso', 18, 4, 5, 345, 'Red');

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Count holes per course combination
SELECT
    course_id,
    tee_marker,
    COUNT(*) as total_holes,
    SUM(par) as total_par,
    SUM(yardage) as total_yardage
FROM course_holes
WHERE course_id IN ('pattana_andreas_brookel', 'pattana_andreas_calypso', 'pattana_brookel_calypso')
GROUP BY course_id, tee_marker
ORDER BY course_id,
    CASE tee_marker
        WHEN 'Blue' THEN 1
        WHEN 'White' THEN 2
        WHEN 'Yellow' THEN 3
        WHEN 'Red' THEN 4
    END;

-- View all holes by course and tee
SELECT
    course_id,
    hole_number,
    tee_marker,
    par,
    stroke_index,
    yardage
FROM course_holes
WHERE course_id IN ('pattana_andreas_brookel', 'pattana_andreas_calypso', 'pattana_brookel_calypso')
ORDER BY course_id, hole_number, tee_marker;

-- =====================================================
-- SUMMARY
-- =====================================================
-- Total Records: 216 (3 courses x 18 holes x 4 tee markers)
--
-- Each course combination:
-- - 18 holes (numbered 1-18 only)
-- - 4 tee markers (Blue, White, Yellow, Red)
-- - 72 records per combination
-- =====================================================

SELECT '==================================================' as '';
SELECT 'Pattana Golf Resort - Course Combinations Complete!' as '';
SELECT '==================================================' as '';
SELECT '3 course combinations created:' as '';
SELECT '  1. pattana_andreas_brookel (ANDREAS + BROOKEL)' as '';
SELECT '  2. pattana_andreas_calypso (ANDREAS + CALYPSO)' as '';
SELECT '  3. pattana_brookel_calypso (BROOKEL + CALYPSO)' as '';
SELECT 'Each with 18 holes and 4 tee markers' as '';
SELECT 'Total: 216 records inserted' as '';
SELECT '==================================================' as '';
-- =====================================================
-- FIX PATTAVIA GOLF CLUB
-- =====================================================
-- Correct data from actual scorecard
-- Includes: Blue, White, Red tees

DELETE FROM course_holes WHERE course_id = 'pattavia';

-- =====================================================
-- BLUE TEES - 7111 yards
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('pattavia', 1, 4, 13, 398, 'blue'),
('pattavia', 2, 4, 9, 413, 'blue'),
('pattavia', 3, 5, 7, 595, 'blue'),
('pattavia', 4, 3, 17, 150, 'blue'),
('pattavia', 5, 4, 15, 392, 'blue'),
('pattavia', 6, 5, 1, 575, 'blue'),
('pattavia', 7, 3, 3, 249, 'blue'),
('pattavia', 8, 4, 5, 397, 'blue'),
('pattavia', 9, 4, 11, 437, 'blue'),
('pattavia', 10, 4, 16, 408, 'blue'),
('pattavia', 11, 4, 10, 367, 'blue'),
('pattavia', 12, 5, 4, 569, 'blue'),
('pattavia', 13, 3, 18, 157, 'blue'),
('pattavia', 14, 4, 12, 409, 'blue'),
('pattavia', 15, 4, 14, 388, 'blue'),
('pattavia', 16, 4, 2, 465, 'blue'),
('pattavia', 17, 3, 6, 225, 'blue'),
('pattavia', 18, 5, 8, 517, 'blue');

-- =====================================================
-- WHITE TEES - 6639 yards
-- =====================================================
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
('pattavia', 10, 4, 16, 389, 'white'),
('pattavia', 11, 4, 10, 333, 'white'),
('pattavia', 12, 5, 4, 533, 'white'),
('pattavia', 13, 3, 18, 139, 'white'),
('pattavia', 14, 4, 12, 376, 'white'),
('pattavia', 15, 4, 14, 358, 'white'),
('pattavia', 16, 4, 2, 438, 'white'),
('pattavia', 17, 3, 6, 203, 'white'),
('pattavia', 18, 5, 8, 492, 'white');

-- =====================================================
-- RED TEES - 5580 yards
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('pattavia', 1, 4, 13, 332, 'red'),
('pattavia', 2, 4, 9, 325, 'red'),
('pattavia', 3, 5, 7, 473, 'red'),
('pattavia', 4, 3, 17, 93, 'red'),
('pattavia', 5, 4, 15, 305, 'red'),
('pattavia', 6, 5, 1, 481, 'red'),
('pattavia', 7, 3, 3, 160, 'red'),
('pattavia', 8, 4, 5, 318, 'red'),
('pattavia', 9, 4, 11, 343, 'red'),
('pattavia', 10, 4, 16, 353, 'red'),
('pattavia', 11, 4, 10, 282, 'red'),
('pattavia', 12, 5, 4, 448, 'red'),
('pattavia', 13, 3, 18, 107, 'red'),
('pattavia', 14, 4, 12, 302, 'red'),
('pattavia', 15, 4, 14, 306, 'red'),
('pattavia', 16, 4, 2, 366, 'red'),
('pattavia', 17, 3, 6, 152, 'red'),
('pattavia', 18, 5, 8, 434, 'red');

SELECT tee_marker, SUM(yardage) as total, SUM(par) as par FROM course_holes WHERE course_id = 'pattavia' GROUP BY tee_marker ORDER BY total DESC;
-- Expected: Blue=7111, White=6639, Red=5580, All Par 72
-- =====================================================
-- Pattaya Country Club - Complete Tee Marker Data
-- =====================================================
-- This file contains ALL tee markers from the scorecard
-- Total: 5 tee markers (Black, Gold, White, Yellow, Blue/Lady)
-- =====================================================

-- Delete existing data for this course
DELETE FROM course_holes WHERE course_id = 'pattaya_country_club';

-- =====================================================
-- BLACK TEES (Championship) - Total: 7054 yards
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('pattaya_country_club', 1, 4, 5, 464, 'Black'),
('pattaya_country_club', 2, 4, 3, 402, 'Black'),
('pattaya_country_club', 3, 5, 13, 531, 'Black'),
('pattaya_country_club', 4, 4, 7, 445, 'Black'),
('pattaya_country_club', 5, 3, 17, 208, 'Black'),
('pattaya_country_club', 6, 4, 15, 375, 'Black'),
('pattaya_country_club', 7, 3, 9, 212, 'Black'),
('pattaya_country_club', 8, 5, 11, 557, 'Black'),
('pattaya_country_club', 9, 4, 1, 446, 'Black'),
('pattaya_country_club', 10, 4, 10, 396, 'Black'),
('pattaya_country_club', 11, 5, 8, 520, 'Black'),
('pattaya_country_club', 12, 3, 18, 155, 'Black'),
('pattaya_country_club', 13, 4, 6, 365, 'Black'),
('pattaya_country_club', 14, 4, 4, 438, 'Black'),
('pattaya_country_club', 15, 4, 16, 379, 'Black'),
('pattaya_country_club', 16, 3, 12, 189, 'Black'),
('pattaya_country_club', 17, 4, 2, 438, 'Black'),
('pattaya_country_club', 18, 5, 14, 514, 'Black');

-- =====================================================
-- GOLD TEES - Total: 6648 yards
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('pattaya_country_club', 1, 4, 5, 436, 'Gold'),
('pattaya_country_club', 2, 4, 3, 392, 'Gold'),
('pattaya_country_club', 3, 5, 13, 507, 'Gold'),
('pattaya_country_club', 4, 4, 7, 421, 'Gold'),
('pattaya_country_club', 5, 3, 17, 185, 'Gold'),
('pattaya_country_club', 6, 4, 15, 354, 'Gold'),
('pattaya_country_club', 7, 3, 9, 188, 'Gold'),
('pattaya_country_club', 8, 5, 11, 525, 'Gold'),
('pattaya_country_club', 9, 4, 1, 414, 'Gold'),
('pattaya_country_club', 10, 4, 10, 367, 'Gold'),
('pattaya_country_club', 11, 5, 8, 505, 'Gold'),
('pattaya_country_club', 12, 3, 18, 150, 'Gold'),
('pattaya_country_club', 13, 4, 6, 352, 'Gold'),
('pattaya_country_club', 14, 4, 4, 409, 'Gold'),
('pattaya_country_club', 15, 4, 16, 364, 'Gold'),
('pattaya_country_club', 16, 3, 12, 177, 'Gold'),
('pattaya_country_club', 17, 4, 2, 408, 'Gold'),
('pattaya_country_club', 18, 5, 14, 494, 'Gold');

-- =====================================================
-- WHITE TEES - Total: 6171 yards
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('pattaya_country_club', 1, 4, 5, 398, 'White'),
('pattaya_country_club', 2, 4, 3, 357, 'White'),
('pattaya_country_club', 3, 5, 13, 488, 'White'),
('pattaya_country_club', 4, 4, 7, 404, 'White'),
('pattaya_country_club', 5, 3, 17, 178, 'White'),
('pattaya_country_club', 6, 4, 15, 308, 'White'),
('pattaya_country_club', 7, 3, 9, 177, 'White'),
('pattaya_country_club', 8, 5, 11, 481, 'White'),
('pattaya_country_club', 9, 4, 1, 414, 'White'),
('pattaya_country_club', 10, 4, 10, 323, 'White'),
('pattaya_country_club', 11, 5, 8, 461, 'White'),
('pattaya_country_club', 12, 3, 18, 137, 'White'),
('pattaya_country_club', 13, 4, 6, 341, 'White'),
('pattaya_country_club', 14, 4, 4, 350, 'White'),
('pattaya_country_club', 15, 4, 16, 341, 'White'),
('pattaya_country_club', 16, 3, 12, 164, 'White'),
('pattaya_country_club', 17, 4, 2, 381, 'White'),
('pattaya_country_club', 18, 5, 14, 473, 'White');

-- =====================================================
-- YELLOW TEES - Total: 5554 yards
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('pattaya_country_club', 1, 4, 5, 345, 'Yellow'),
('pattaya_country_club', 2, 4, 3, 302, 'Yellow'),
('pattaya_country_club', 3, 5, 13, 477, 'Yellow'),
('pattaya_country_club', 4, 4, 7, 388, 'Yellow'),
('pattaya_country_club', 5, 3, 17, 168, 'Yellow'),
('pattaya_country_club', 6, 4, 15, 280, 'Yellow'),
('pattaya_country_club', 7, 3, 9, 150, 'Yellow'),
('pattaya_country_club', 8, 5, 11, 458, 'Yellow'),
('pattaya_country_club', 9, 4, 1, 383, 'Yellow'),
('pattaya_country_club', 10, 4, 10, 312, 'Yellow'),
('pattaya_country_club', 11, 5, 8, 452, 'Yellow'),
('pattaya_country_club', 12, 3, 18, 121, 'Yellow'),
('pattaya_country_club', 13, 4, 6, 328, 'Yellow'),
('pattaya_country_club', 14, 4, 4, 330, 'Yellow'),
('pattaya_country_club', 15, 4, 16, 331, 'Yellow'),
('pattaya_country_club', 16, 3, 12, 146, 'Yellow'),
('pattaya_country_club', 17, 4, 2, 371, 'Yellow'),
('pattaya_country_club', 18, 5, 14, 458, 'Yellow');

-- =====================================================
-- BLUE/LADY TEES - Total: 5393 yards
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('pattaya_country_club', 1, 4, 5, 342, 'Blue'),
('pattaya_country_club', 2, 4, 3, 335, 'Blue'),
('pattaya_country_club', 3, 5, 13, 482, 'Blue'),
('pattaya_country_club', 4, 4, 7, 358, 'Blue'),
('pattaya_country_club', 5, 3, 17, 155, 'Blue'),
('pattaya_country_club', 6, 4, 15, 231, 'Blue'),
('pattaya_country_club', 7, 3, 9, 141, 'Blue'),
('pattaya_country_club', 8, 5, 11, 427, 'Blue'),
('pattaya_country_club', 9, 4, 1, 322, 'Blue'),
('pattaya_country_club', 10, 4, 10, 293, 'Blue'),
('pattaya_country_club', 11, 5, 8, 440, 'Blue'),
('pattaya_country_club', 12, 3, 18, 115, 'Blue'),
('pattaya_country_club', 13, 4, 6, 311, 'Blue'),
('pattaya_country_club', 14, 4, 4, 282, 'Blue'),
('pattaya_country_club', 15, 4, 16, 280, 'Blue'),
('pattaya_country_club', 16, 3, 12, 138, 'Blue'),
('pattaya_country_club', 17, 4, 2, 340, 'Blue'),
('pattaya_country_club', 18, 5, 14, 425, 'Blue');

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check total holes inserted (should be 90: 5 tees x 18 holes)
SELECT
    'Total Holes Inserted' as check_type,
    COUNT(*) as count,
    CASE
        WHEN COUNT(*) = 90 THEN 'PASS'
        ELSE 'FAIL'
    END as status
FROM course_holes
WHERE course_id = 'pattaya_country_club';

-- Verify yardage totals for each tee marker
SELECT
    tee_marker,
    COUNT(*) as holes,
    SUM(yardage) as total_yardage,
    SUM(par) as total_par
FROM course_holes
WHERE course_id = 'pattaya_country_club'
GROUP BY tee_marker
ORDER BY SUM(yardage) DESC;

-- Expected totals:
-- Black: 7054 yards, Par 72
-- Gold: 6648 yards, Par 72
-- White: 6171 yards, Par 72 (HCP NET)
-- Yellow: 5554 yards, Par 72
-- Blue: 5393 yards, Par 72

-- Verify par distribution for each tee
SELECT
    tee_marker,
    par,
    COUNT(*) as hole_count
FROM course_holes
WHERE course_id = 'pattaya_country_club'
GROUP BY tee_marker, par
ORDER BY tee_marker, par;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT '=============================================' as message
UNION ALL SELECT 'Pattaya Country Club - Data Import Complete'
UNION ALL SELECT '============================================='
UNION ALL SELECT 'Black Tees: 7054 yards'
UNION ALL SELECT 'Gold Tees: 6648 yards'
UNION ALL SELECT 'White Tees: 6171 yards'
UNION ALL SELECT 'Yellow Tees: 5554 yards'
UNION ALL SELECT 'Blue Tees: 5393 yards'
UNION ALL SELECT '============================================='
UNION ALL SELECT 'Total: 90 holes (5 tee markers x 18 holes)'
UNION ALL SELECT 'All tees: Par 72'
UNION ALL SELECT '=============================================';
-- =====================================================
-- Pleasant Valley Golf Club - Complete Tee Markers Data
-- =====================================================
-- Course: Pleasant Valley Golf Club
-- Location: Chonburi, Thailand
-- Total Par: 72 (36 out, 36 in)
--
-- Tee Markers:
-- Black: 7002 yards (Championship)
-- Blue:  6353 yards
-- White: 5832 yards
-- Red:   5221 yards (Ladies)
-- =====================================================

-- Clean up existing data for Pleasant Valley
DELETE FROM course_holes WHERE course_id = 'pleasant_valley';

-- =====================================================
-- BLACK TEES (Championship) - 7002 yards, Par 72
-- =====================================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9
('pleasant_valley', 1, 4, 4, 423, 'black'),
('pleasant_valley', 2, 4, 3, 442, 'black'),
('pleasant_valley', 3, 5, 1, 601, 'black'),
('pleasant_valley', 4, 4, 14, 332, 'black'),
('pleasant_valley', 5, 3, 16, 200, 'black'),
('pleasant_valley', 6, 5, 6, 530, 'black'),
('pleasant_valley', 7, 4, 18, 350, 'black'),
('pleasant_valley', 8, 3, 12, 240, 'black'),
('pleasant_valley', 9, 4, 4, 412, 'black'),
-- Back 9
('pleasant_valley', 10, 4, 2, 460, 'black'),
('pleasant_valley', 11, 4, 8, 408, 'black'),
('pleasant_valley', 12, 4, 10, 360, 'black'),
('pleasant_valley', 13, 3, 15, 174, 'black'),
('pleasant_valley', 14, 4, 7, 435, 'black'),
('pleasant_valley', 15, 5, 11, 485, 'black'),
('pleasant_valley', 16, 4, 5, 430, 'black'),
('pleasant_valley', 17, 3, 17, 149, 'black'),
('pleasant_valley', 18, 5, 13, 580, 'black');

-- =====================================================
-- BLUE TEES - 6353 yards, Par 72
-- =====================================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9
('pleasant_valley', 1, 4, 4, 391, 'blue'),
('pleasant_valley', 2, 4, 3, 408, 'blue'),
('pleasant_valley', 3, 5, 1, 549, 'blue'),
('pleasant_valley', 4, 4, 14, 300, 'blue'),
('pleasant_valley', 5, 3, 16, 174, 'blue'),
('pleasant_valley', 6, 5, 6, 507, 'blue'),
('pleasant_valley', 7, 4, 18, 324, 'blue'),
('pleasant_valley', 8, 3, 12, 205, 'blue'),
('pleasant_valley', 9, 4, 4, 385, 'blue'),
-- Back 9
('pleasant_valley', 10, 4, 2, 427, 'blue'),
('pleasant_valley', 11, 4, 8, 380, 'blue'),
('pleasant_valley', 12, 4, 10, 319, 'blue'),
('pleasant_valley', 13, 3, 15, 152, 'blue'),
('pleasant_valley', 14, 4, 7, 370, 'blue'),
('pleasant_valley', 15, 5, 11, 458, 'blue'),
('pleasant_valley', 16, 4, 5, 403, 'blue'),
('pleasant_valley', 17, 3, 17, 122, 'blue'),
('pleasant_valley', 18, 5, 13, 479, 'blue');

-- =====================================================
-- WHITE TEES - 5832 yards, Par 72
-- =====================================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9
('pleasant_valley', 1, 4, 4, 363, 'white'),
('pleasant_valley', 2, 4, 3, 368, 'white'),
('pleasant_valley', 3, 5, 1, 508, 'white'),
('pleasant_valley', 4, 4, 14, 281, 'white'),
('pleasant_valley', 5, 3, 16, 160, 'white'),
('pleasant_valley', 6, 5, 6, 457, 'white'),
('pleasant_valley', 7, 4, 18, 297, 'white'),
('pleasant_valley', 8, 3, 12, 153, 'white'),
('pleasant_valley', 9, 4, 4, 365, 'white'),
-- Back 9
('pleasant_valley', 10, 4, 2, 398, 'white'),
('pleasant_valley', 11, 4, 8, 359, 'white'),
('pleasant_valley', 12, 4, 10, 289, 'white'),
('pleasant_valley', 13, 3, 15, 133, 'white'),
('pleasant_valley', 14, 4, 7, 331, 'white'),
('pleasant_valley', 15, 5, 11, 439, 'white'),
('pleasant_valley', 16, 4, 5, 380, 'white'),
('pleasant_valley', 17, 3, 17, 103, 'white'),
('pleasant_valley', 18, 5, 13, 448, 'white');

-- =====================================================
-- RED TEES (Ladies) - 5221 yards, Par 72
-- =====================================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9
('pleasant_valley', 1, 4, 4, 310, 'red'),
('pleasant_valley', 2, 4, 3, 317, 'red'),
('pleasant_valley', 3, 5, 1, 466, 'red'),
('pleasant_valley', 4, 4, 14, 263, 'red'),
('pleasant_valley', 5, 3, 16, 127, 'red'),
('pleasant_valley', 6, 5, 6, 425, 'red'),
('pleasant_valley', 7, 4, 18, 263, 'red'),
('pleasant_valley', 8, 3, 12, 112, 'red'),
('pleasant_valley', 9, 4, 4, 324, 'red'),
-- Back 9
('pleasant_valley', 10, 4, 2, 370, 'red'),
('pleasant_valley', 11, 4, 8, 320, 'red'),
('pleasant_valley', 12, 4, 10, 255, 'red'),
('pleasant_valley', 13, 3, 15, 104, 'red'),
('pleasant_valley', 14, 4, 7, 300, 'red'),
('pleasant_valley', 15, 5, 11, 420, 'red'),
('pleasant_valley', 16, 4, 5, 355, 'red'),
('pleasant_valley', 17, 3, 17, 86, 'red'),
('pleasant_valley', 18, 5, 13, 404, 'red');

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify total yardages and par for each tee
SELECT
    tee_marker,
    COUNT(*) as holes,
    SUM(par) as total_par,
    SUM(yardage) as total_yardage,
    SUM(CASE WHEN hole_number <= 9 THEN yardage ELSE 0 END) as front_9,
    SUM(CASE WHEN hole_number > 9 THEN yardage ELSE 0 END) as back_9
FROM course_holes
WHERE course_id = 'pleasant_valley'
GROUP BY tee_marker
ORDER BY total_yardage DESC;

-- Expected results:
-- Black: 18 holes, Par 72, 7002 yards (Front: 3530, Back: 3472)
-- Blue:  18 holes, Par 72, 6353 yards (Front: 3243, Back: 3110)
-- White: 18 holes, Par 72, 5832 yards (Front: 2952, Back: 2880)
-- Red:   18 holes, Par 72, 5221 yards (Front: 2607, Back: 2614)

-- Verify par distribution
SELECT
    tee_marker,
    par,
    COUNT(*) as hole_count
FROM course_holes
WHERE course_id = 'pleasant_valley'
GROUP BY tee_marker, par
ORDER BY tee_marker, par;

-- Expected: Each tee should have 4 par 3s, 10 par 4s, and 4 par 5s

-- Display all holes for manual verification
SELECT
    tee_marker,
    hole_number,
    par,
    stroke_index,
    yardage
FROM course_holes
WHERE course_id = 'pleasant_valley'
ORDER BY tee_marker, hole_number;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT '✓ Pleasant Valley Golf Club - All Tee Markers Successfully Loaded' as status,
       '4 tee markers (Black: 7002, Blue: 6353, White: 5832, Red: 5221)' as details,
       '72 total records inserted (18 holes × 4 tees)' as record_count;
-- ================================================================
-- Plutaluang Royal Thai Navy Golf Course - Complete Tee Markers Data
-- ================================================================
-- This file contains ALL tee marker data extracted from the scorecard
-- Course: Plutaluang Royal Thai Navy Golf Course
-- Layout: North Course (holes 1-9) + West Course (holes 10-18)
-- Tee Markers: BLUE, WHITE, YELLOW, RED
-- ================================================================

-- Clean up existing data for Plutaluang
DELETE FROM course_holes WHERE course_id = 'plutaluang';

-- ================================================================
-- BLUE TEES (Championship)
-- Total Yardage: 6851 yards
-- ================================================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- NORTH COURSE (Holes 1-9)
('plutaluang', 1, 4, 11, 422, 'blue'),
('plutaluang', 2, 5, 1, 521, 'blue'),
('plutaluang', 3, 3, 15, 165, 'blue'),
('plutaluang', 4, 5, 3, 596, 'blue'),
('plutaluang', 5, 4, 13, 421, 'blue'),
('plutaluang', 6, 4, 17, 180, 'blue'),
('plutaluang', 7, 4, 7, 397, 'blue'),
('plutaluang', 8, 4, 5, 427, 'blue'),
('plutaluang', 9, 4, 9, 422, 'blue'),
-- WEST COURSE (Holes 10-18)
('plutaluang', 10, 4, 10, 372, 'blue'),
('plutaluang', 11, 5, 4, 540, 'blue'),
('plutaluang', 12, 3, 18, 167, 'blue'),
('plutaluang', 13, 4, 8, 412, 'blue'),
('plutaluang', 14, 5, 2, 570, 'blue'),
('plutaluang', 15, 4, 6, 410, 'blue'),
('plutaluang', 16, 4, 14, 455, 'blue'),
('plutaluang', 17, 3, 16, 167, 'blue'),
('plutaluang', 18, 4, 12, 407, 'blue');

-- ================================================================
-- WHITE TEES (Regular/Men's)
-- Total Yardage: 6720 yards
-- ================================================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- NORTH COURSE (Holes 1-9)
('plutaluang', 1, 4, 11, 402, 'white'),
('plutaluang', 2, 5, 1, 496, 'white'),
('plutaluang', 3, 3, 15, 145, 'white'),
('plutaluang', 4, 5, 3, 576, 'white'),
('plutaluang', 5, 4, 13, 406, 'white'),
('plutaluang', 6, 4, 17, 165, 'white'),
('plutaluang', 7, 4, 7, 377, 'white'),
('plutaluang', 8, 4, 5, 417, 'white'),
('plutaluang', 9, 4, 9, 383, 'white'),
-- WEST COURSE (Holes 10-18)
('plutaluang', 10, 4, 10, 364, 'white'),
('plutaluang', 11, 5, 4, 520, 'white'),
('plutaluang', 12, 3, 18, 155, 'white'),
('plutaluang', 13, 4, 8, 387, 'white'),
('plutaluang', 14, 5, 2, 555, 'white'),
('plutaluang', 15, 4, 6, 389, 'white'),
('plutaluang', 16, 4, 14, 433, 'white'),
('plutaluang', 17, 3, 16, 158, 'white'),
('plutaluang', 18, 4, 12, 392, 'white');

-- ================================================================
-- YELLOW TEES (Forward)
-- Total Yardage: 6081 yards
-- ================================================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- NORTH COURSE (Holes 1-9)
('plutaluang', 1, 4, 11, 376, 'yellow'),
('plutaluang', 2, 5, 1, 468, 'yellow'),
('plutaluang', 3, 3, 15, 125, 'yellow'),
('plutaluang', 4, 5, 3, 559, 'yellow'),
('plutaluang', 5, 4, 13, 387, 'yellow'),
('plutaluang', 6, 4, 17, 144, 'yellow'),
('plutaluang', 7, 4, 7, 367, 'yellow'),
('plutaluang', 8, 4, 5, 346, 'yellow'),
('plutaluang', 9, 4, 9, 312, 'yellow'),
-- WEST COURSE (Holes 10-18)
('plutaluang', 10, 4, 10, 331, 'yellow'),
('plutaluang', 11, 5, 4, 447, 'yellow'),
('plutaluang', 12, 3, 18, 149, 'yellow'),
('plutaluang', 13, 4, 8, 365, 'yellow'),
('plutaluang', 14, 5, 2, 518, 'yellow'),
('plutaluang', 15, 4, 6, 314, 'yellow'),
('plutaluang', 16, 4, 14, 387, 'yellow'),
('plutaluang', 17, 3, 16, 142, 'yellow'),
('plutaluang', 18, 4, 12, 364, 'yellow');

-- ================================================================
-- RED TEES (Ladies')
-- Total Yardage: 5627 yards
-- ================================================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- NORTH COURSE (Holes 1-9)
('plutaluang', 1, 4, 11, 338, 'red'),
('plutaluang', 2, 5, 1, 395, 'red'),
('plutaluang', 3, 3, 15, 110, 'red'),
('plutaluang', 4, 5, 3, 489, 'red'),
('plutaluang', 5, 4, 13, 333, 'red'),
('plutaluang', 6, 4, 17, 129, 'red'),
('plutaluang', 7, 4, 7, 325, 'red'),
('plutaluang', 8, 4, 5, 343, 'red'),
('plutaluang', 9, 4, 9, 301, 'red'),
-- WEST COURSE (Holes 10-18)
('plutaluang', 10, 4, 10, 312, 'red'),
('plutaluang', 11, 5, 4, 436, 'red'),
('plutaluang', 12, 3, 18, 141, 'red'),
('plutaluang', 13, 4, 8, 346, 'red'),
('plutaluang', 14, 5, 2, 503, 'red'),
('plutaluang', 15, 4, 6, 283, 'red'),
('plutaluang', 16, 4, 14, 357, 'red'),
('plutaluang', 17, 3, 16, 128, 'red'),
('plutaluang', 18, 4, 12, 358, 'red');

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================

-- Check total records inserted (should be 72 = 4 tees x 18 holes)
SELECT
    'Total Records' as check_type,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 72 THEN 'PASS' ELSE 'FAIL' END as status
FROM course_holes
WHERE course_id = 'plutaluang';

-- Verify yardage totals for each tee
SELECT
    tee_marker,
    COUNT(*) as holes,
    SUM(yardage) as total_yardage,
    SUM(par) as total_par,
    CASE
        WHEN tee_marker = 'blue' AND SUM(yardage) = 6851 THEN 'PASS'
        WHEN tee_marker = 'white' AND SUM(yardage) = 6720 THEN 'PASS'
        WHEN tee_marker = 'yellow' AND SUM(yardage) = 6081 THEN 'PASS'
        WHEN tee_marker = 'red' AND SUM(yardage) = 5627 THEN 'PASS'
        ELSE 'FAIL'
    END as yardage_check
FROM course_holes
WHERE course_id = 'plutaluang'
GROUP BY tee_marker
ORDER BY SUM(yardage) DESC;

-- Verify all 18 holes exist for each tee
SELECT
    tee_marker,
    COUNT(DISTINCT hole_number) as unique_holes,
    CASE WHEN COUNT(DISTINCT hole_number) = 18 THEN 'PASS' ELSE 'FAIL' END as status
FROM course_holes
WHERE course_id = 'plutaluang'
GROUP BY tee_marker
ORDER BY tee_marker;

-- Verify par totals (should be 72 for all tees)
SELECT
    tee_marker,
    SUM(par) as total_par,
    CASE WHEN SUM(par) = 72 THEN 'PASS' ELSE 'FAIL' END as status
FROM course_holes
WHERE course_id = 'plutaluang'
GROUP BY tee_marker
ORDER BY tee_marker;

-- Display hole-by-hole comparison
SELECT
    hole_number,
    MAX(CASE WHEN tee_marker = 'blue' THEN yardage END) as blue_yds,
    MAX(CASE WHEN tee_marker = 'white' THEN yardage END) as white_yds,
    MAX(CASE WHEN tee_marker = 'yellow' THEN yardage END) as yellow_yds,
    MAX(CASE WHEN tee_marker = 'red' THEN yardage END) as red_yds,
    MAX(par) as par,
    MAX(stroke_index) as si
FROM course_holes
WHERE course_id = 'plutaluang'
GROUP BY hole_number
ORDER BY hole_number;

-- ================================================================
-- SUCCESS MESSAGE
-- ================================================================
SELECT
    '✓ Plutaluang Royal Thai Navy Golf Course - All Tee Markers Imported Successfully!' as message
UNION ALL
SELECT '  - Blue Tees: 6851 yards, Par 72'
UNION ALL
SELECT '  - White Tees: 6720 yards, Par 72'
UNION ALL
SELECT '  - Yellow Tees: 6081 yards, Par 72'
UNION ALL
SELECT '  - Red Tees: 5627 yards, Par 72'
UNION ALL
SELECT '  - Total: 4 tee markers, 72 holes inserted';
-- ================================================
-- Royal Lakeside Golf Club - Complete Tee Data Fix
-- ================================================
-- This script adds ALL tee markers from the scorecard
-- Course ID: royal_lakeside
-- Date: 2025-10-18
-- ================================================

-- Clean up existing data for this course
DELETE FROM course_holes WHERE course_id = 'royal_lakeside';

-- ================================================
-- BLACK TEES (Championship) - Total: 7,003 yards
-- ================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('royal_lakeside', 1, 5, 5, 522, 'black'),
('royal_lakeside', 2, 4, 11, 383, 'black'),
('royal_lakeside', 3, 3, 17, 185, 'black'),
('royal_lakeside', 4, 4, 9, 404, 'black'),
('royal_lakeside', 5, 4, 13, 424, 'black'),
('royal_lakeside', 6, 3, 15, 205, 'black'),
('royal_lakeside', 7, 5, 1, 543, 'black'),
('royal_lakeside', 8, 4, 7, 428, 'black'),
('royal_lakeside', 9, 4, 3, 413, 'black'),
('royal_lakeside', 10, 5, 6, 544, 'black'),
('royal_lakeside', 11, 4, 16, 367, 'black'),
('royal_lakeside', 12, 3, 14, 200, 'black'),
('royal_lakeside', 13, 4, 4, 453, 'black'),
('royal_lakeside', 14, 4, 8, 419, 'black'),
('royal_lakeside', 15, 3, 18, 177, 'black'),
('royal_lakeside', 16, 4, 10, 393, 'black'),
('royal_lakeside', 17, 4, 12, 380, 'black'),
('royal_lakeside', 18, 5, 2, 563, 'black');

-- ================================================
-- BLUE TEES (Men's) - Total: 6,653 yards
-- ================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('royal_lakeside', 1, 5, 5, 501, 'blue'),
('royal_lakeside', 2, 4, 11, 359, 'blue'),
('royal_lakeside', 3, 3, 17, 167, 'blue'),
('royal_lakeside', 4, 4, 9, 377, 'blue'),
('royal_lakeside', 5, 4, 13, 372, 'blue'),
('royal_lakeside', 6, 3, 15, 176, 'blue'),
('royal_lakeside', 7, 5, 1, 531, 'blue'),
('royal_lakeside', 8, 4, 7, 414, 'blue'),
('royal_lakeside', 9, 4, 3, 401, 'blue'),
('royal_lakeside', 10, 5, 6, 532, 'blue'),
('royal_lakeside', 11, 4, 16, 340, 'blue'),
('royal_lakeside', 12, 3, 14, 195, 'blue'),
('royal_lakeside', 13, 4, 4, 434, 'blue'),
('royal_lakeside', 14, 4, 8, 402, 'blue'),
('royal_lakeside', 15, 3, 18, 162, 'blue'),
('royal_lakeside', 16, 4, 10, 378, 'blue'),
('royal_lakeside', 17, 4, 12, 362, 'blue'),
('royal_lakeside', 18, 5, 2, 550, 'blue');

-- ================================================
-- WHITE TEES (Men's) - Total: 6,256 yards
-- ================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('royal_lakeside', 1, 5, 5, 490, 'white'),
('royal_lakeside', 2, 4, 11, 331, 'white'),
('royal_lakeside', 3, 3, 17, 144, 'white'),
('royal_lakeside', 4, 4, 9, 365, 'white'),
('royal_lakeside', 5, 4, 13, 353, 'white'),
('royal_lakeside', 6, 3, 15, 154, 'white'),
('royal_lakeside', 7, 5, 1, 508, 'white'),
('royal_lakeside', 8, 4, 7, 389, 'white'),
('royal_lakeside', 9, 4, 3, 376, 'white'),
('royal_lakeside', 10, 5, 6, 497, 'white'),
('royal_lakeside', 11, 4, 16, 311, 'white'),
('royal_lakeside', 12, 3, 14, 163, 'white'),
('royal_lakeside', 13, 4, 4, 420, 'white'),
('royal_lakeside', 14, 4, 8, 375, 'white'),
('royal_lakeside', 15, 3, 18, 152, 'white'),
('royal_lakeside', 16, 4, 10, 356, 'white'),
('royal_lakeside', 17, 4, 12, 350, 'white'),
('royal_lakeside', 18, 5, 2, 522, 'white');

-- ================================================
-- ORANGE TEES (Forward) - Total: 5,578 yards
-- ================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('royal_lakeside', 1, 5, 5, 420, 'orange'),
('royal_lakeside', 2, 4, 11, 308, 'orange'),
('royal_lakeside', 3, 3, 17, 136, 'orange'),
('royal_lakeside', 4, 4, 9, 318, 'orange'),
('royal_lakeside', 5, 4, 13, 316, 'orange'),
('royal_lakeside', 6, 3, 15, 131, 'orange'),
('royal_lakeside', 7, 5, 1, 477, 'orange'),
('royal_lakeside', 8, 4, 7, 368, 'orange'),
('royal_lakeside', 9, 4, 3, 327, 'orange'),
('royal_lakeside', 10, 5, 6, 460, 'orange'),
('royal_lakeside', 11, 4, 16, 277, 'orange'),
('royal_lakeside', 12, 3, 14, 128, 'orange'),
('royal_lakeside', 13, 4, 4, 352, 'orange'),
('royal_lakeside', 14, 4, 8, 324, 'orange'),
('royal_lakeside', 15, 3, 18, 134, 'orange'),
('royal_lakeside', 16, 4, 10, 325, 'orange'),
('royal_lakeside', 17, 4, 12, 291, 'orange'),
('royal_lakeside', 18, 5, 2, 486, 'orange');

-- ================================================
-- VERIFICATION QUERIES
-- ================================================

-- Check total records inserted (should be 72: 4 tees x 18 holes)
SELECT
    'Total Records' as check_type,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 72 THEN 'PASS' ELSE 'FAIL' END as status
FROM course_holes
WHERE course_id = 'royal_lakeside';

-- Verify yardage totals by tee
SELECT
    tee_marker,
    COUNT(*) as holes,
    SUM(par) as total_par,
    SUM(yardage) as total_yardage
FROM course_holes
WHERE course_id = 'royal_lakeside'
GROUP BY tee_marker
ORDER BY total_yardage DESC;

-- Expected Results:
-- black:  7,003 yards, Par 72
-- blue:   6,653 yards, Par 72
-- white:  6,256 yards, Par 72
-- orange: 5,578 yards, Par 72

-- ================================================
-- SUCCESS MESSAGE
-- ================================================
SELECT '
================================================
Royal Lakeside Golf Club - Data Import Complete
================================================
Black Tees:  7,003 yards (Championship)
Blue Tees:   6,653 yards (Men''s)
White Tees:  6,256 yards (Men''s)
Orange Tees: 5,578 yards (Forward)

All 4 tee markers imported successfully!
Total: 72 holes (4 tees x 18 holes)
Par: 72 for all tees
================================================
' as import_summary;
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
-- ============================================================================
-- Siam Plantation Golf Club - Single 18-Hole Course
-- ============================================================================
-- Course: Pineapple (holes 1-9) + Sugar Cane (holes 10-18)
-- Course ID: siam_plantation
-- Tee Markers: Black, Blue, White, Red
-- Total Records: 72 (18 holes × 4 tee markers)
-- ============================================================================

-- Clean up existing data
DELETE FROM course_holes WHERE course_id = 'siam_plantation';

-- ============================================================================
-- BLACK TEES - Holes 1-18
-- ============================================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Holes 1-9: Pineapple Course
('siam_plantation', 1, 4, 5, 405, 'black'),
('siam_plantation', 2, 5, 8, 566, 'black'),
('siam_plantation', 3, 3, 3, 235, 'black'),
('siam_plantation', 4, 4, 4, 412, 'black'),
('siam_plantation', 5, 4, 9, 371, 'black'),
('siam_plantation', 6, 5, 2, 578, 'black'),
('siam_plantation', 7, 4, 1, 461, 'black'),
('siam_plantation', 8, 3, 7, 184, 'black'),
('siam_plantation', 9, 4, 6, 433, 'black'),
-- Holes 10-18: Sugar Cane Course
('siam_plantation', 10, 4, 8, 400, 'black'),
('siam_plantation', 11, 4, 7, 405, 'black'),
('siam_plantation', 12, 3, 5, 195, 'black'),
('siam_plantation', 13, 4, 2, 452, 'black'),
('siam_plantation', 14, 5, 6, 596, 'black'),
('siam_plantation', 15, 3, 4, 242, 'black'),
('siam_plantation', 16, 5, 9, 538, 'black'),
('siam_plantation', 17, 4, 3, 410, 'black'),
('siam_plantation', 18, 4, 1, 498, 'black');

-- ============================================================================
-- BLUE TEES - Holes 1-18
-- ============================================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Holes 1-9: Pineapple Course
('siam_plantation', 1, 4, 5, 375, 'blue'),
('siam_plantation', 2, 5, 8, 537, 'blue'),
('siam_plantation', 3, 3, 3, 197, 'blue'),
('siam_plantation', 4, 4, 4, 378, 'blue'),
('siam_plantation', 5, 4, 9, 347, 'blue'),
('siam_plantation', 6, 5, 2, 551, 'blue'),
('siam_plantation', 7, 4, 1, 421, 'blue'),
('siam_plantation', 8, 3, 7, 165, 'blue'),
('siam_plantation', 9, 4, 6, 400, 'blue'),
-- Holes 10-18: Sugar Cane Course
('siam_plantation', 10, 4, 8, 367, 'blue'),
('siam_plantation', 11, 4, 7, 374, 'blue'),
('siam_plantation', 12, 3, 5, 165, 'blue'),
('siam_plantation', 13, 4, 2, 418, 'blue'),
('siam_plantation', 14, 5, 6, 543, 'blue'),
('siam_plantation', 15, 3, 4, 199, 'blue'),
('siam_plantation', 16, 5, 9, 506, 'blue'),
('siam_plantation', 17, 4, 3, 381, 'blue'),
('siam_plantation', 18, 4, 1, 472, 'blue');

-- ============================================================================
-- WHITE TEES - Holes 1-18
-- ============================================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Holes 1-9: Pineapple Course
('siam_plantation', 1, 4, 5, 287, 'white'),
('siam_plantation', 2, 5, 8, 475, 'white'),
('siam_plantation', 3, 3, 3, 164, 'white'),
('siam_plantation', 4, 4, 4, 343, 'white'),
('siam_plantation', 5, 4, 9, 316, 'white'),
('siam_plantation', 6, 5, 2, 512, 'white'),
('siam_plantation', 7, 4, 1, 382, 'white'),
('siam_plantation', 8, 3, 7, 145, 'white'),
('siam_plantation', 9, 4, 6, 361, 'white'),
-- Holes 10-18: Sugar Cane Course
('siam_plantation', 10, 4, 8, 296, 'white'),
('siam_plantation', 11, 4, 7, 347, 'white'),
('siam_plantation', 12, 3, 5, 132, 'white'),
('siam_plantation', 13, 4, 2, 390, 'white'),
('siam_plantation', 14, 5, 6, 497, 'white'),
('siam_plantation', 15, 3, 4, 168, 'white'),
('siam_plantation', 16, 5, 9, 465, 'white'),
('siam_plantation', 17, 4, 3, 348, 'white'),
('siam_plantation', 18, 4, 1, 427, 'white');

-- ============================================================================
-- RED TEES - Holes 1-18
-- ============================================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Holes 1-9: Pineapple Course
('siam_plantation', 1, 4, 5, 251, 'red'),
('siam_plantation', 2, 5, 8, 430, 'red'),
('siam_plantation', 3, 3, 3, 114, 'red'),
('siam_plantation', 4, 4, 4, 281, 'red'),
('siam_plantation', 5, 4, 9, 286, 'red'),
('siam_plantation', 6, 5, 2, 437, 'red'),
('siam_plantation', 7, 4, 1, 325, 'red'),
('siam_plantation', 8, 3, 7, 118, 'red'),
('siam_plantation', 9, 4, 6, 301, 'red'),
-- Holes 10-18: Sugar Cane Course
('siam_plantation', 10, 4, 8, 258, 'red'),
('siam_plantation', 11, 4, 7, 301, 'red'),
('siam_plantation', 12, 3, 5, 117, 'red'),
('siam_plantation', 13, 4, 2, 302, 'red'),
('siam_plantation', 14, 5, 6, 424, 'red'),
('siam_plantation', 15, 3, 4, 115, 'red'),
('siam_plantation', 16, 5, 9, 432, 'red'),
('siam_plantation', 17, 4, 3, 291, 'red'),
('siam_plantation', 18, 4, 1, 358, 'red');
