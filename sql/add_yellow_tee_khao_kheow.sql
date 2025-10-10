-- Add Yellow Tee data for Khao Kheow courses
-- Extracted from actual Khao Kheow scorecard
-- Par and stroke index same as white tees, only yardages differ

-- ==============================================
-- KHAO KHEOW - A+B COMBINATION (Yellow Tees)
-- ==============================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Nine A (Holes 1-9) - Yellow tees
('khao_kheow_ab', 1, 3, 17, 298, 'yellow'),
('khao_kheow_ab', 2, 4, 7, 513, 'yellow'),
('khao_kheow_ab', 3, 5, 13, 164, 'yellow'),
('khao_kheow_ab', 4, 4, 1, 417, 'yellow'),
('khao_kheow_ab', 5, 3, 15, 132, 'yellow'),
('khao_kheow_ab', 6, 4, 9, 384, 'yellow'),
('khao_kheow_ab', 7, 5, 11, 296, 'yellow'),
('khao_kheow_ab', 8, 3, 3, 459, 'yellow'),
('khao_kheow_ab', 9, 5, 5, 404, 'yellow'),
-- Nine B (Holes 10-18) - Yellow tees
('khao_kheow_ab', 10, 4, 12, 371, 'yellow'),
('khao_kheow_ab', 11, 5, 6, 526, 'yellow'),
('khao_kheow_ab', 12, 3, 16, 168, 'yellow'),
('khao_kheow_ab', 13, 4, 10, 382, 'yellow'),
('khao_kheow_ab', 14, 4, 18, 340, 'yellow'),
('khao_kheow_ab', 15, 5, 4, 510, 'yellow'),
('khao_kheow_ab', 16, 4, 14, 424, 'yellow'),
('khao_kheow_ab', 17, 3, 8, 128, 'yellow'),
('khao_kheow_ab', 18, 4, 2, 403, 'yellow');

-- ==============================================
-- KHAO KHEOW - A+C COMBINATION (Yellow Tees)
-- ==============================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Nine A (Holes 1-9) - Yellow tees (same as above)
('khao_kheow_ac', 1, 3, 17, 298, 'yellow'),
('khao_kheow_ac', 2, 4, 7, 513, 'yellow'),
('khao_kheow_ac', 3, 5, 13, 164, 'yellow'),
('khao_kheow_ac', 4, 4, 1, 417, 'yellow'),
('khao_kheow_ac', 5, 3, 15, 132, 'yellow'),
('khao_kheow_ac', 6, 4, 9, 384, 'yellow'),
('khao_kheow_ac', 7, 5, 11, 296, 'yellow'),
('khao_kheow_ac', 8, 3, 3, 459, 'yellow'),
('khao_kheow_ac', 9, 5, 5, 404, 'yellow'),
-- Nine C (Holes 10-18) - Yellow tees
('khao_kheow_ac', 10, 4, 4, 525, 'yellow'),
('khao_kheow_ac', 11, 3, 6, 395, 'yellow'),
('khao_kheow_ac', 12, 4, 16, 167, 'yellow'),
('khao_kheow_ac', 13, 5, 18, 388, 'yellow'),
('khao_kheow_ac', 14, 4, 12, 394, 'yellow'),
('khao_kheow_ac', 15, 4, 8, 382, 'yellow'),
('khao_kheow_ac', 16, 4, 2, 511, 'yellow'),
('khao_kheow_ac', 17, 5, 14, 165, 'yellow'),
('khao_kheow_ac', 18, 4, 10, 337, 'yellow');

-- ==============================================
-- KHAO KHEOW - B+C COMBINATION (Yellow Tees)
-- ==============================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Nine B (Holes 1-9) - Yellow tees
('khao_kheow_bc', 1, 4, 12, 371, 'yellow'),
('khao_kheow_bc', 2, 5, 6, 526, 'yellow'),
('khao_kheow_bc', 3, 3, 16, 168, 'yellow'),
('khao_kheow_bc', 4, 4, 10, 382, 'yellow'),
('khao_kheow_bc', 5, 4, 18, 340, 'yellow'),
('khao_kheow_bc', 6, 5, 4, 510, 'yellow'),
('khao_kheow_bc', 7, 4, 14, 424, 'yellow'),
('khao_kheow_bc', 8, 3, 8, 128, 'yellow'),
('khao_kheow_bc', 9, 4, 2, 403, 'yellow'),
-- Nine C (Holes 10-18) - Yellow tees (same as above)
('khao_kheow_bc', 10, 4, 3, 525, 'yellow'),
('khao_kheow_bc', 11, 3, 5, 395, 'yellow'),
('khao_kheow_bc', 12, 4, 15, 167, 'yellow'),
('khao_kheow_bc', 13, 5, 17, 388, 'yellow'),
('khao_kheow_bc', 14, 4, 11, 394, 'yellow'),
('khao_kheow_bc', 15, 4, 7, 382, 'yellow'),
('khao_kheow_bc', 16, 4, 1, 511, 'yellow'),
('khao_kheow_bc', 17, 5, 13, 165, 'yellow'),
('khao_kheow_bc', 18, 4, 9, 337, 'yellow');

-- ==============================================
-- VERIFY YELLOW TEE DATA
-- ==============================================

-- Check A+B yellow tees
SELECT 'Khao Kheow A+B Yellow' as course,
    SUM(CASE WHEN hole_number <= 9 THEN yardage ELSE 0 END) as front_yards,
    SUM(CASE WHEN hole_number > 9 THEN yardage ELSE 0 END) as back_yards,
    SUM(yardage) as total_yards,
    SUM(par) as total_par
FROM course_holes
WHERE course_id = 'khao_kheow_ab' AND tee_marker = 'yellow';

-- Check A+C yellow tees
SELECT 'Khao Kheow A+C Yellow' as course,
    SUM(CASE WHEN hole_number <= 9 THEN yardage ELSE 0 END) as front_yards,
    SUM(CASE WHEN hole_number > 9 THEN yardage ELSE 0 END) as back_yards,
    SUM(yardage) as total_yards,
    SUM(par) as total_par
FROM course_holes
WHERE course_id = 'khao_kheow_ac' AND tee_marker = 'yellow';

-- Check B+C yellow tees
SELECT 'Khao Kheow B+C Yellow' as course,
    SUM(CASE WHEN hole_number <= 9 THEN yardage ELSE 0 END) as front_yards,
    SUM(CASE WHEN hole_number > 9 THEN yardage ELSE 0 END) as back_yards,
    SUM(yardage) as total_yards,
    SUM(par) as total_par
FROM course_holes
WHERE course_id = 'khao_kheow_bc' AND tee_marker = 'yellow';
