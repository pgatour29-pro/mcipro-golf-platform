-- Pre-populate Pattaya area golf courses
-- Courses: Bangpakong, Burapha East, Burapha West, Khao Kheow

-- ==============================================
-- BURAPHA GOLF CLUB - EAST COURSE (from scorecard image)
-- ==============================================

-- Insert course
INSERT INTO courses (id, name, created_at) VALUES
('burapha_east', 'Burapha Golf Club - East Course', NOW());

-- Insert holes for Burapha East (from scorecard data)
-- Front 9: Par 4,4,3,4,5,3,5,4,4 (36) | Index 14,6,18,8,12,16,10,4,2
-- Back 9: Par 4,4,3,4,4,5,4,3,5 (36) | Index 3,13,17,9,5,11,1,15,7
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9
('burapha_east', 1, 4, 14, 370, 'white'),
('burapha_east', 2, 4, 6, 385, 'white'),
('burapha_east', 3, 3, 18, 165, 'white'),
('burapha_east', 4, 4, 8, 360, 'white'),
('burapha_east', 5, 5, 12, 495, 'white'),
('burapha_east', 6, 3, 16, 155, 'white'),
('burapha_east', 7, 5, 10, 510, 'white'),
('burapha_east', 8, 4, 4, 380, 'white'),
('burapha_east', 9, 4, 2, 395, 'white'),
-- Back 9
('burapha_east', 10, 4, 3, 390, 'white'),
('burapha_east', 11, 4, 13, 370, 'white'),
('burapha_east', 12, 3, 17, 170, 'white'),
('burapha_east', 13, 4, 9, 365, 'white'),
('burapha_east', 14, 4, 5, 375, 'white'),
('burapha_east', 15, 5, 11, 505, 'white'),
('burapha_east', 16, 4, 1, 400, 'white'),
('burapha_east', 17, 3, 15, 160, 'white'),
('burapha_east', 18, 5, 7, 520, 'white');

-- ==============================================
-- BURAPHA GOLF CLUB - WEST COURSE
-- ==============================================

INSERT INTO courses (id, name, created_at) VALUES
('burapha_west', 'Burapha Golf Club - West Course', NOW());

-- Typical championship course layout (adjust when you scan actual scorecard)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9
('burapha_west', 1, 4, 7, 380, 'white'),
('burapha_west', 2, 5, 3, 520, 'white'),
('burapha_west', 3, 3, 15, 170, 'white'),
('burapha_west', 4, 4, 11, 390, 'white'),
('burapha_west', 5, 4, 5, 400, 'white'),
('burapha_west', 6, 4, 13, 350, 'white'),
('burapha_west', 7, 3, 17, 165, 'white'),
('burapha_west', 8, 5, 9, 510, 'white'),
('burapha_west', 9, 4, 1, 410, 'white'),
-- Back 9
('burapha_west', 10, 4, 6, 385, 'white'),
('burapha_west', 11, 3, 18, 160, 'white'),
('burapha_west', 12, 5, 10, 500, 'white'),
('burapha_west', 13, 4, 2, 405, 'white'),
('burapha_west', 14, 4, 12, 370, 'white'),
('burapha_west', 15, 4, 8, 395, 'white'),
('burapha_west', 16, 3, 16, 175, 'white'),
('burapha_west', 17, 5, 4, 515, 'white'),
('burapha_west', 18, 4, 14, 360, 'white');

-- ==============================================
-- BANGPAKONG RIVERSIDE COUNTRY CLUB
-- ==============================================

INSERT INTO courses (id, name, created_at) VALUES
('bangpakong', 'Bangpakong Riverside Country Club', NOW());

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9
('bangpakong', 1, 4, 9, 375, 'white'),
('bangpakong', 2, 5, 3, 525, 'white'),
('bangpakong', 3, 4, 11, 365, 'white'),
('bangpakong', 4, 3, 17, 155, 'white'),
('bangpakong', 5, 4, 5, 390, 'white'),
('bangpakong', 6, 4, 7, 385, 'white'),
('bangpakong', 7, 3, 15, 170, 'white'),
('bangpakong', 8, 5, 1, 530, 'white'),
('bangpakong', 9, 4, 13, 360, 'white'),
-- Back 9
('bangpakong', 10, 4, 8, 380, 'white'),
('bangpakong', 11, 4, 12, 370, 'white'),
('bangpakong', 12, 5, 4, 510, 'white'),
('bangpakong', 13, 3, 18, 165, 'white'),
('bangpakong', 14, 4, 6, 395, 'white'),
('bangpakong', 15, 4, 10, 375, 'white'),
('bangpakong', 16, 3, 16, 160, 'white'),
('bangpakong', 17, 5, 2, 520, 'white'),
('bangpakong', 18, 4, 14, 365, 'white');

-- ==============================================
-- KHAO KHEOW COUNTRY CLUB
-- ==============================================

INSERT INTO courses (id, name, created_at) VALUES
('khao_kheow', 'Khao Kheow Country Club', NOW());

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Front 9
('khao_kheow', 1, 4, 13, 365, 'white'),
('khao_kheow', 2, 4, 5, 395, 'white'),
('khao_kheow', 3, 3, 17, 160, 'white'),
('khao_kheow', 4, 5, 1, 540, 'white'),
('khao_kheow', 5, 4, 9, 380, 'white'),
('khao_kheow', 6, 4, 11, 370, 'white'),
('khao_kheow', 7, 3, 15, 170, 'white'),
('khao_kheow', 8, 5, 3, 520, 'white'),
('khao_kheow', 9, 4, 7, 385, 'white'),
-- Back 9
('khao_kheow', 10, 4, 12, 375, 'white'),
('khao_kheow', 11, 4, 8, 385, 'white'),
('khao_kheow', 12, 3, 18, 165, 'white'),
('khao_kheow', 13, 5, 4, 510, 'white'),
('khao_kheow', 14, 4, 10, 370, 'white'),
('khao_kheow', 15, 4, 2, 405, 'white'),
('khao_kheow', 16, 3, 16, 175, 'white'),
('khao_kheow', 17, 5, 6, 515, 'white'),
('khao_kheow', 18, 4, 14, 360, 'white');

-- ==============================================
-- VERIFICATION QUERIES
-- ==============================================

-- Check all courses inserted
SELECT id, name, created_at FROM courses ORDER BY name;

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
