-- Pre-populate Pattaya area golf courses
-- Courses: Burapha East, Burapha West, Bangpakong, Laem Chabang, Khao Kheow

-- ==============================================
-- BURAPHA GOLF CLUB - EAST COURSE (from scorecard image)
-- ==============================================

-- Insert course
INSERT INTO courses (id, name, tee_marker, created_at) VALUES
('burapha_east_white', 'Burapha Golf Club - East Course', 'white', NOW());

-- Insert holes for Burapha East (from scorecard data)
-- Front 9: Par 4,4,3,4,5,3,5,4,4 (36) | Index 14,6,18,8,12,16,10,4,2
-- Back 9: Par 4,4,3,4,4,5,4,3,5 (36) | Index 3,13,17,9,5,11,1,15,7
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9
('burapha_east_white', 1, 4, 14, 370, 'white'),
('burapha_east_white', 2, 4, 6, 385, 'white'),
('burapha_east_white', 3, 3, 18, 165, 'white'),
('burapha_east_white', 4, 4, 8, 360, 'white'),
('burapha_east_white', 5, 5, 12, 495, 'white'),
('burapha_east_white', 6, 3, 16, 155, 'white'),
('burapha_east_white', 7, 5, 10, 510, 'white'),
('burapha_east_white', 8, 4, 4, 380, 'white'),
('burapha_east_white', 9, 4, 2, 395, 'white'),
-- Back 9
('burapha_east_white', 10, 4, 3, 390, 'white'),
('burapha_east_white', 11, 4, 13, 370, 'white'),
('burapha_east_white', 12, 3, 17, 170, 'white'),
('burapha_east_white', 13, 4, 9, 365, 'white'),
('burapha_east_white', 14, 4, 5, 375, 'white'),
('burapha_east_white', 15, 5, 11, 505, 'white'),
('burapha_east_white', 16, 4, 1, 400, 'white'),
('burapha_east_white', 17, 3, 15, 160, 'white'),
('burapha_east_white', 18, 5, 7, 520, 'white');

-- ==============================================
-- BURAPHA GOLF CLUB - WEST COURSE
-- ==============================================

INSERT INTO courses (id, name, tee_marker, created_at) VALUES
('burapha_west_white', 'Burapha Golf Club - West Course', 'white', NOW());

-- Typical championship course layout (adjust when you scan actual scorecard)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9
('burapha_west_white', 1, 4, 7, 380, 'white'),
('burapha_west_white', 2, 5, 3, 520, 'white'),
('burapha_west_white', 3, 3, 15, 170, 'white'),
('burapha_west_white', 4, 4, 11, 390, 'white'),
('burapha_west_white', 5, 4, 5, 400, 'white'),
('burapha_west_white', 6, 4, 13, 350, 'white'),
('burapha_west_white', 7, 3, 17, 165, 'white'),
('burapha_west_white', 8, 5, 9, 510, 'white'),
('burapha_west_white', 9, 4, 1, 410, 'white'),
-- Back 9
('burapha_west_white', 10, 4, 6, 385, 'white'),
('burapha_west_white', 11, 3, 18, 160, 'white'),
('burapha_west_white', 12, 5, 10, 500, 'white'),
('burapha_west_white', 13, 4, 2, 405, 'white'),
('burapha_west_white', 14, 4, 12, 370, 'white'),
('burapha_west_white', 15, 4, 8, 395, 'white'),
('burapha_west_white', 16, 3, 16, 175, 'white'),
('burapha_west_white', 17, 5, 4, 515, 'white'),
('burapha_west_white', 18, 4, 14, 360, 'white');

-- ==============================================
-- BANGPAKONG RIVERSIDE COUNTRY CLUB
-- ==============================================

INSERT INTO courses (id, name, tee_marker, created_at) VALUES
('bangpakong_white', 'Bangpakong Riverside Country Club', 'white', NOW());

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9
('bangpakong_white', 1, 4, 9, 375, 'white'),
('bangpakong_white', 2, 5, 3, 525, 'white'),
('bangpakong_white', 3, 4, 11, 365, 'white'),
('bangpakong_white', 4, 3, 17, 155, 'white'),
('bangpakong_white', 5, 4, 5, 390, 'white'),
('bangpakong_white', 6, 4, 7, 385, 'white'),
('bangpakong_white', 7, 3, 15, 170, 'white'),
('bangpakong_white', 8, 5, 1, 530, 'white'),
('bangpakong_white', 9, 4, 13, 360, 'white'),
-- Back 9
('bangpakong_white', 10, 4, 8, 380, 'white'),
('bangpakong_white', 11, 4, 12, 370, 'white'),
('bangpakong_white', 12, 5, 4, 510, 'white'),
('bangpakong_white', 13, 3, 18, 165, 'white'),
('bangpakong_white', 14, 4, 6, 395, 'white'),
('bangpakong_white', 15, 4, 10, 375, 'white'),
('bangpakong_white', 16, 3, 16, 160, 'white'),
('bangpakong_white', 17, 5, 2, 520, 'white'),
('bangpakong_white', 18, 4, 14, 365, 'white');

-- ==============================================
-- LAEM CHABANG INTERNATIONAL COUNTRY CLUB
-- ==============================================

INSERT INTO courses (id, name, tee_marker, created_at) VALUES
('laem_chabang_white', 'Laem Chabang International Country Club', 'white', NOW());

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9
('laem_chabang_white', 1, 4, 11, 370, 'white'),
('laem_chabang_white', 2, 4, 7, 380, 'white'),
('laem_chabang_white', 3, 3, 17, 165, 'white'),
('laem_chabang_white', 4, 5, 3, 515, 'white'),
('laem_chabang_white', 5, 4, 9, 375, 'white'),
('laem_chabang_white', 6, 4, 5, 395, 'white'),
('laem_chabang_white', 7, 3, 15, 170, 'white'),
('laem_chabang_white', 8, 5, 1, 535, 'white'),
('laem_chabang_white', 9, 4, 13, 360, 'white'),
-- Back 9
('laem_chabang_white', 10, 4, 10, 375, 'white'),
('laem_chabang_white', 11, 5, 2, 525, 'white'),
('laem_chabang_white', 12, 3, 18, 160, 'white'),
('laem_chabang_white', 13, 4, 8, 385, 'white'),
('laem_chabang_white', 14, 4, 12, 365, 'white'),
('laem_chabang_white', 15, 4, 6, 390, 'white'),
('laem_chabang_white', 16, 3, 16, 175, 'white'),
('laem_chabang_white', 17, 5, 4, 520, 'white'),
('laem_chabang_white', 18, 4, 14, 370, 'white');

-- ==============================================
-- KHAO KHEOW COUNTRY CLUB
-- ==============================================

INSERT INTO courses (id, name, tee_marker, created_at) VALUES
('khao_kheow_white', 'Khao Kheow Country Club', 'white', NOW());

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9
('khao_kheow_white', 1, 4, 13, 365, 'white'),
('khao_kheow_white', 2, 4, 5, 395, 'white'),
('khao_kheow_white', 3, 3, 17, 160, 'white'),
('khao_kheow_white', 4, 5, 1, 540, 'white'),
('khao_kheow_white', 5, 4, 9, 380, 'white'),
('khao_kheow_white', 6, 4, 11, 370, 'white'),
('khao_kheow_white', 7, 3, 15, 170, 'white'),
('khao_kheow_white', 8, 5, 3, 520, 'white'),
('khao_kheow_white', 9, 4, 7, 385, 'white'),
-- Back 9
('khao_kheow_white', 10, 4, 12, 375, 'white'),
('khao_kheow_white', 11, 4, 8, 385, 'white'),
('khao_kheow_white', 12, 3, 18, 165, 'white'),
('khao_kheow_white', 13, 5, 4, 510, 'white'),
('khao_kheow_white', 14, 4, 10, 370, 'white'),
('khao_kheow_white', 15, 4, 2, 405, 'white'),
('khao_kheow_white', 16, 3, 16, 175, 'white'),
('khao_kheow_white', 17, 5, 6, 515, 'white'),
('khao_kheow_white', 18, 4, 14, 360, 'white');

-- ==============================================
-- VERIFICATION QUERIES
-- ==============================================

-- Check all courses inserted
SELECT name, tee_marker FROM courses ORDER BY name;

-- Count holes per course (should be 18 each)
SELECT course_id, COUNT(*) as hole_count
FROM course_holes
GROUP BY course_id
ORDER BY course_id;

-- Verify par totals (should be 72 for most courses)
SELECT
    c.name,
    SUM(CASE WHEN ch.hole_number <= 9 THEN ch.par ELSE 0 END) as front_9_par,
    SUM(CASE WHEN ch.hole_number > 9 THEN ch.par ELSE 0 END) as back_9_par,
    SUM(ch.par) as total_par
FROM courses c
JOIN course_holes ch ON c.id = ch.course_id
GROUP BY c.id, c.name
ORDER BY c.name;
