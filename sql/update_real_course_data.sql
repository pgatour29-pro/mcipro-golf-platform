-- Update courses with REAL data from actual scorecards
-- Fixes Bangpakong, Burapha West, Khao Kheow with accurate par, stroke index, yardage

-- ==============================================
-- DELETE OLD DATA FIRST
-- ==============================================

DELETE FROM course_holes WHERE course_id IN ('bangpakong', 'burapha_west', 'khao_kheow_ab', 'khao_kheow_ac', 'khao_kheow_bc');

-- ==============================================
-- BANGPAKONG RIVERSIDE (from actual scorecard)
-- ==============================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9 (White tees from scorecard)
('bangpakong', 1, 4, 14, 370, 'white'),
('bangpakong', 2, 4, 12, 380, 'white'),
('bangpakong', 3, 5, 4, 495, 'white'),
('bangpakong', 4, 3, 18, 197, 'white'),
('bangpakong', 5, 4, 8, 407, 'white'),
('bangpakong', 6, 4, 10, 403, 'white'),
('bangpakong', 7, 3, 16, 206, 'white'),
('bangpakong', 8, 4, 6, 417, 'white'),
('bangpakong', 9, 5, 2, 524, 'white'),
-- Back 9 (White tees from scorecard)
('bangpakong', 10, 4, 9, 374, 'white'),
('bangpakong', 11, 4, 7, 384, 'white'),
('bangpakong', 12, 4, 3, 505, 'white'),
('bangpakong', 13, 3, 17, 168, 'white'),
('bangpakong', 14, 4, 5, 412, 'white'),
('bangpakong', 15, 4, 11, 365, 'white'),
('bangpakong', 16, 3, 15, 182, 'white'),
('bangpakong', 17, 4, 13, 323, 'white'),
('bangpakong', 18, 5, 1, 520, 'white');

-- ==============================================
-- BURAPHA WEST COURSE - Crystal Spring (C) + Dunes (D)
-- ==============================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9: Crystal Spring C1-C9
('burapha_west', 1, 4, 4, 406, 'white'),
('burapha_west', 2, 5, 8, 545, 'white'),
('burapha_west', 3, 4, 2, 484, 'white'),
('burapha_west', 4, 4, 14, 370, 'white'),
('burapha_west', 5, 3, 18, 162, 'white'),
('burapha_west', 6, 4, 12, 373, 'white'),
('burapha_west', 7, 5, 10, 526, 'white'),
('burapha_west', 8, 3, 16, 200, 'white'),
('burapha_west', 9, 4, 6, 177, 'white'),
-- Back 9: Dunes D1-D9
('burapha_west', 10, 5, 13, 524, 'white'),
('burapha_west', 11, 3, 11, 202, 'white'),
('burapha_west', 12, 4, 7, 445, 'white'),
('burapha_west', 13, 4, 3, 456, 'white'),
('burapha_west', 14, 5, 9, 542, 'white'),
('burapha_west', 15, 4, 5, 432, 'white'),
('burapha_west', 16, 4, 17, 285, 'white'),
('burapha_west', 17, 3, 15, 232, 'white'),
('burapha_west', 18, 4, 1, 510, 'white');

-- ==============================================
-- KHAO KHEOW - A+B COMBINATION
-- ==============================================
-- Note: Extracted from 3-nine scorecard showing A, B, C nines
-- PAR for each nine visible on scorecard

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Nine A (Holes 1-9) - White tees
('khao_kheow_ab', 1, 3, 17, 232, 'white'),
('khao_kheow_ab', 2, 4, 7, 443, 'white'),
('khao_kheow_ab', 3, 5, 13, 523, 'white'),
('khao_kheow_ab', 4, 4, 1, 456, 'white'),
('khao_kheow_ab', 5, 3, 15, 175, 'white'),
('khao_kheow_ab', 6, 4, 9, 389, 'white'),
('khao_kheow_ab', 7, 5, 11, 535, 'white'),
('khao_kheow_ab', 8, 3, 3, 147, 'white'),
('khao_kheow_ab', 9, 5, 5, 493, 'white'),
-- Nine B (Holes 10-18) - White tees
('khao_kheow_ab', 10, 4, 12, 490, 'white'),
('khao_kheow_ab', 11, 5, 6, 553, 'white'),
('khao_kheow_ab', 12, 3, 16, 199, 'white'),
('khao_kheow_ab', 13, 4, 10, 426, 'white'),
('khao_kheow_ab', 14, 4, 18, 375, 'white'),
('khao_kheow_ab', 15, 5, 4, 560, 'white'),
('khao_kheow_ab', 16, 4, 14, 465, 'white'),
('khao_kheow_ab', 17, 3, 8, 146, 'white'),
('khao_kheow_ab', 18, 4, 2, 430, 'white');

-- ==============================================
-- KHAO KHEOW - A+C COMBINATION
-- ==============================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Nine A (Holes 1-9) - Same as above
('khao_kheow_ac', 1, 3, 17, 232, 'white'),
('khao_kheow_ac', 2, 4, 7, 443, 'white'),
('khao_kheow_ac', 3, 5, 13, 523, 'white'),
('khao_kheow_ac', 4, 4, 1, 456, 'white'),
('khao_kheow_ac', 5, 3, 15, 175, 'white'),
('khao_kheow_ac', 6, 4, 9, 389, 'white'),
('khao_kheow_ac', 7, 5, 11, 535, 'white'),
('khao_kheow_ac', 8, 3, 3, 147, 'white'),
('khao_kheow_ac', 9, 5, 5, 493, 'white'),
-- Nine C (Holes 10-18) - White tees
('khao_kheow_ac', 10, 4, 4, 550, 'white'),
('khao_kheow_ac', 11, 3, 6, 442, 'white'),
('khao_kheow_ac', 12, 4, 16, 184, 'white'),
('khao_kheow_ac', 13, 5, 18, 378, 'white'),
('khao_kheow_ac', 14, 4, 12, 398, 'white'),
('khao_kheow_ac', 15, 4, 8, 402, 'white'),
('khao_kheow_ac', 16, 4, 2, 556, 'white'),
('khao_kheow_ac', 17, 5, 14, 165, 'white'),
('khao_kheow_ac', 18, 4, 10, 337, 'white');

-- ==============================================
-- KHAO KHEOW - B+C COMBINATION
-- ==============================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Nine B (Holes 1-9)
('khao_kheow_bc', 1, 4, 12, 490, 'white'),
('khao_kheow_bc', 2, 5, 6, 553, 'white'),
('khao_kheow_bc', 3, 3, 16, 199, 'white'),
('khao_kheow_bc', 4, 4, 10, 426, 'white'),
('khao_kheow_bc', 5, 4, 18, 375, 'white'),
('khao_kheow_bc', 6, 5, 4, 560, 'white'),
('khao_kheow_bc', 7, 4, 14, 465, 'white'),
('khao_kheow_bc', 8, 3, 8, 146, 'white'),
('khao_kheow_bc', 9, 4, 2, 430, 'white'),
-- Nine C (Holes 10-18)
('khao_kheow_bc', 10, 4, 3, 550, 'white'),
('khao_kheow_bc', 11, 3, 5, 442, 'white'),
('khao_kheow_bc', 12, 4, 15, 184, 'white'),
('khao_kheow_bc', 13, 5, 17, 378, 'white'),
('khao_kheow_bc', 14, 4, 11, 398, 'white'),
('khao_kheow_bc', 15, 4, 7, 402, 'white'),
('khao_kheow_bc', 16, 4, 1, 556, 'white'),
('khao_kheow_bc', 17, 5, 13, 165, 'white'),
('khao_kheow_bc', 18, 4, 9, 337, 'white');

-- ==============================================
-- VERIFY UPDATES
-- ==============================================

-- Check Bangpakong
SELECT 'Bangpakong' as course,
    SUM(CASE WHEN hole_number <= 9 THEN par ELSE 0 END) as front_par,
    SUM(CASE WHEN hole_number > 9 THEN par ELSE 0 END) as back_par,
    SUM(par) as total_par
FROM course_holes
WHERE course_id = 'bangpakong';

-- Check Burapha West
SELECT 'Burapha West' as course,
    SUM(CASE WHEN hole_number <= 9 THEN par ELSE 0 END) as front_par,
    SUM(CASE WHEN hole_number > 9 THEN par ELSE 0 END) as back_par,
    SUM(par) as total_par
FROM course_holes
WHERE course_id = 'burapha_west';

-- Check Khao Kheow A+B
SELECT 'Khao Kheow A+B' as course,
    SUM(CASE WHEN hole_number <= 9 THEN par ELSE 0 END) as front_par,
    SUM(CASE WHEN hole_number > 9 THEN par ELSE 0 END) as back_par,
    SUM(par) as total_par
FROM course_holes
WHERE course_id = 'khao_kheow_ab';
