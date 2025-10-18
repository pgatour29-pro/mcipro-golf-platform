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
