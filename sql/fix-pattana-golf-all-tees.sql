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
