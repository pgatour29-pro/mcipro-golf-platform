-- =====================================================================
-- Greenwood Golf & Resort - 3-NINE COURSE SYSTEM
-- =====================================================================
-- Three 9-hole courses: A, B, C
-- Golfer selects: Front 9 [A/B/C] + Back 9 [A/B/C]
-- =====================================================================

-- =====================================================================
-- STEP 1: Create course entries in courses table
-- =====================================================================

INSERT INTO courses (id, name, location)
VALUES
    ('greenwood_a', 'Greenwood Golf & Resort - Course A', 'Phrao, Chiang Mai'),
    ('greenwood_b', 'Greenwood Golf & Resort - Course B', 'Phrao, Chiang Mai'),
    ('greenwood_c', 'Greenwood Golf & Resort - Course C', 'Phrao, Chiang Mai')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    location = EXCLUDED.location;

-- =====================================================================
-- STEP 2: Clean up old course holes
-- =====================================================================

DELETE FROM course_holes WHERE course_id IN ('greenwood_a', 'greenwood_b', 'greenwood_c');

-- =====================================================================
-- COURSE A (9 holes)
-- Par: 4, 4, 3, 5, 4, 4, 3, 5, 4 = 36
-- =====================================================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Blue Tees
('greenwood_a', 1, 4, 9, 380, 'blue'),
('greenwood_a', 2, 4, 13, 350, 'blue'),
('greenwood_a', 3, 3, 17, 175, 'blue'),
('greenwood_a', 4, 5, 1, 520, 'blue'),
('greenwood_a', 5, 4, 7, 410, 'blue'),
('greenwood_a', 6, 4, 11, 390, 'blue'),
('greenwood_a', 7, 3, 15, 165, 'blue'),
('greenwood_a', 8, 5, 3, 530, 'blue'),
('greenwood_a', 9, 4, 5, 400, 'blue'),

-- White Tees
('greenwood_a', 1, 4, 9, 350, 'white'),
('greenwood_a', 2, 4, 13, 320, 'white'),
('greenwood_a', 3, 3, 17, 155, 'white'),
('greenwood_a', 4, 5, 1, 490, 'white'),
('greenwood_a', 5, 4, 7, 380, 'white'),
('greenwood_a', 6, 4, 11, 360, 'white'),
('greenwood_a', 7, 3, 15, 145, 'white'),
('greenwood_a', 8, 5, 3, 500, 'white'),
('greenwood_a', 9, 4, 5, 370, 'white'),

-- Yellow Tees
('greenwood_a', 1, 4, 9, 320, 'yellow'),
('greenwood_a', 2, 4, 13, 290, 'yellow'),
('greenwood_a', 3, 3, 17, 135, 'yellow'),
('greenwood_a', 4, 5, 1, 460, 'yellow'),
('greenwood_a', 5, 4, 7, 350, 'yellow'),
('greenwood_a', 6, 4, 11, 330, 'yellow'),
('greenwood_a', 7, 3, 15, 125, 'yellow'),
('greenwood_a', 8, 5, 3, 470, 'yellow'),
('greenwood_a', 9, 4, 5, 340, 'yellow'),

-- Red Tees
('greenwood_a', 1, 4, 9, 290, 'red'),
('greenwood_a', 2, 4, 13, 260, 'red'),
('greenwood_a', 3, 3, 17, 115, 'red'),
('greenwood_a', 4, 5, 1, 430, 'red'),
('greenwood_a', 5, 4, 7, 320, 'red'),
('greenwood_a', 6, 4, 11, 300, 'red'),
('greenwood_a', 7, 3, 15, 105, 'red'),
('greenwood_a', 8, 5, 3, 440, 'red'),
('greenwood_a', 9, 4, 5, 310, 'red');

-- =====================================================================
-- COURSE B (9 holes)
-- Par: 4, 5, 3, 4, 4, 4, 3, 5, 4 = 36
-- =====================================================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Blue Tees
('greenwood_b', 1, 4, 10, 395, 'blue'),
('greenwood_b', 2, 5, 2, 540, 'blue'),
('greenwood_b', 3, 3, 16, 180, 'blue'),
('greenwood_b', 4, 4, 8, 405, 'blue'),
('greenwood_b', 5, 4, 12, 370, 'blue'),
('greenwood_b', 6, 4, 6, 420, 'blue'),
('greenwood_b', 7, 3, 18, 160, 'blue'),
('greenwood_b', 8, 5, 4, 515, 'blue'),
('greenwood_b', 9, 4, 14, 385, 'blue'),

-- White Tees
('greenwood_b', 1, 4, 10, 365, 'white'),
('greenwood_b', 2, 5, 2, 510, 'white'),
('greenwood_b', 3, 3, 16, 160, 'white'),
('greenwood_b', 4, 4, 8, 375, 'white'),
('greenwood_b', 5, 4, 12, 340, 'white'),
('greenwood_b', 6, 4, 6, 390, 'white'),
('greenwood_b', 7, 3, 18, 140, 'white'),
('greenwood_b', 8, 5, 4, 485, 'white'),
('greenwood_b', 9, 4, 14, 355, 'white'),

-- Yellow Tees
('greenwood_b', 1, 4, 10, 335, 'yellow'),
('greenwood_b', 2, 5, 2, 480, 'yellow'),
('greenwood_b', 3, 3, 16, 140, 'yellow'),
('greenwood_b', 4, 4, 8, 345, 'yellow'),
('greenwood_b', 5, 4, 12, 310, 'yellow'),
('greenwood_b', 6, 4, 6, 360, 'yellow'),
('greenwood_b', 7, 3, 18, 120, 'yellow'),
('greenwood_b', 8, 5, 4, 455, 'yellow'),
('greenwood_b', 9, 4, 14, 325, 'yellow'),

-- Red Tees
('greenwood_b', 1, 4, 10, 305, 'red'),
('greenwood_b', 2, 5, 2, 450, 'red'),
('greenwood_b', 3, 3, 16, 120, 'red'),
('greenwood_b', 4, 4, 8, 315, 'red'),
('greenwood_b', 5, 4, 12, 280, 'red'),
('greenwood_b', 6, 4, 6, 330, 'red'),
('greenwood_b', 7, 3, 18, 100, 'red'),
('greenwood_b', 8, 5, 4, 425, 'red'),
('greenwood_b', 9, 4, 14, 295, 'red');

-- =====================================================================
-- COURSE C (9 holes)
-- Par: 4, 4, 5, 3, 4, 4, 5, 3, 4 = 36
-- =====================================================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Blue Tees
('greenwood_c', 1, 4, 11, 385, 'blue'),
('greenwood_c', 2, 4, 15, 360, 'blue'),
('greenwood_c', 3, 5, 5, 525, 'blue'),
('greenwood_c', 4, 3, 17, 170, 'blue'),
('greenwood_c', 5, 4, 9, 400, 'blue'),
('greenwood_c', 6, 4, 13, 375, 'blue'),
('greenwood_c', 7, 5, 3, 535, 'blue'),
('greenwood_c', 8, 3, 15, 175, 'blue'),
('greenwood_c', 9, 4, 7, 390, 'blue'),

-- White Tees
('greenwood_c', 1, 4, 11, 355, 'white'),
('greenwood_c', 2, 4, 15, 330, 'white'),
('greenwood_c', 3, 5, 5, 495, 'white'),
('greenwood_c', 4, 3, 17, 150, 'white'),
('greenwood_c', 5, 4, 9, 370, 'white'),
('greenwood_c', 6, 4, 13, 345, 'white'),
('greenwood_c', 7, 5, 3, 505, 'white'),
('greenwood_c', 8, 3, 15, 155, 'white'),
('greenwood_c', 9, 4, 7, 360, 'white'),

-- Yellow Tees
('greenwood_c', 1, 4, 11, 325, 'yellow'),
('greenwood_c', 2, 4, 15, 300, 'yellow'),
('greenwood_c', 3, 5, 5, 465, 'yellow'),
('greenwood_c', 4, 3, 17, 130, 'yellow'),
('greenwood_c', 5, 4, 9, 340, 'yellow'),
('greenwood_c', 6, 4, 13, 315, 'yellow'),
('greenwood_c', 7, 5, 3, 475, 'yellow'),
('greenwood_c', 8, 3, 15, 135, 'yellow'),
('greenwood_c', 9, 4, 7, 330, 'yellow'),

-- Red Tees
('greenwood_c', 1, 4, 11, 295, 'red'),
('greenwood_c', 2, 4, 15, 270, 'red'),
('greenwood_c', 3, 5, 5, 435, 'red'),
('greenwood_c', 4, 3, 17, 110, 'red'),
('greenwood_c', 5, 4, 9, 310, 'red'),
('greenwood_c', 6, 4, 13, 285, 'red'),
('greenwood_c', 7, 5, 3, 445, 'red'),
('greenwood_c', 8, 3, 15, 115, 'red'),
('greenwood_c', 9, 4, 7, 300, 'red');

-- =====================================================================
-- VERIFICATION QUERIES
-- =====================================================================

-- Check courses were inserted
SELECT id, name FROM courses WHERE id LIKE 'greenwood_%' ORDER BY id;

-- Check hole counts (should be 108 total: 3 courses × 9 holes × 4 tees)
SELECT course_id, COUNT(*) as hole_count
FROM course_holes
WHERE course_id LIKE 'greenwood_%'
GROUP BY course_id
ORDER BY course_id;

-- Check par totals for each course (should all be 36)
SELECT course_id, tee_marker, SUM(par) as total_par
FROM course_holes
WHERE course_id LIKE 'greenwood_%'
GROUP BY course_id, tee_marker
ORDER BY course_id, tee_marker;
