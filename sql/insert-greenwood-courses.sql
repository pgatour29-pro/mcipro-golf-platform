-- =====================================================================
-- Greenwood Golf & Resort - 3-NINE COURSE SYSTEM - ACTUAL DATA
-- =====================================================================
-- Data extracted from official Greenwood scorecards
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
-- COURSE A (9 holes) - From Official Scorecard
-- Par: 4, 3, 4, 5, 4, 3, 5, 4, 4 = 36
-- Stroke Index: 2, 5, 4, 3, 8, 9, 6, 7, 1
-- =====================================================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Blue Tees
('greenwood_a', 1, 4, 2, 416, 'blue'),
('greenwood_a', 2, 3, 5, 221, 'blue'),
('greenwood_a', 3, 4, 4, 412, 'blue'),
('greenwood_a', 4, 5, 3, 567, 'blue'),
('greenwood_a', 5, 4, 8, 329, 'blue'),
('greenwood_a', 6, 3, 9, 186, 'blue'),
('greenwood_a', 7, 5, 6, 544, 'blue'),
('greenwood_a', 8, 4, 7, 378, 'blue'),
('greenwood_a', 9, 4, 1, 446, 'blue'),

-- White Tees
('greenwood_a', 1, 4, 2, 387, 'white'),
('greenwood_a', 2, 3, 5, 193, 'white'),
('greenwood_a', 3, 4, 4, 389, 'white'),
('greenwood_a', 4, 5, 3, 533, 'white'),
('greenwood_a', 5, 4, 8, 301, 'white'),
('greenwood_a', 6, 3, 9, 154, 'white'),
('greenwood_a', 7, 5, 6, 519, 'white'),
('greenwood_a', 8, 4, 7, 349, 'white'),
('greenwood_a', 9, 4, 1, 422, 'white'),

-- Yellow Tees
('greenwood_a', 1, 4, 2, 369, 'yellow'),
('greenwood_a', 2, 3, 5, 175, 'yellow'),
('greenwood_a', 3, 4, 4, 369, 'yellow'),
('greenwood_a', 4, 5, 3, 514, 'yellow'),
('greenwood_a', 5, 4, 8, 283, 'yellow'),
('greenwood_a', 6, 3, 9, 133, 'yellow'),
('greenwood_a', 7, 5, 6, 491, 'yellow'),
('greenwood_a', 8, 4, 7, 326, 'yellow'),
('greenwood_a', 9, 4, 1, 394, 'yellow'),

-- Red Tees
('greenwood_a', 1, 4, 2, 350, 'red'),
('greenwood_a', 2, 3, 5, 140, 'red'),
('greenwood_a', 3, 4, 4, 350, 'red'),
('greenwood_a', 4, 5, 3, 488, 'red'),
('greenwood_a', 5, 4, 8, 261, 'red'),
('greenwood_a', 6, 3, 9, 112, 'red'),
('greenwood_a', 7, 5, 6, 463, 'red'),
('greenwood_a', 8, 4, 7, 304, 'red'),
('greenwood_a', 9, 4, 1, 371, 'red');

-- =====================================================================
-- COURSE B (9 holes) - From Official Scorecard
-- Par: 4, 3, 4, 5, 3, 4, 4, 5, 4 = 36
-- Stroke Index: 8, 5, 3, 2, 9, 7, 1, 4, 6
-- =====================================================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Blue Tees
('greenwood_b', 1, 4, 8, 363, 'blue'),
('greenwood_b', 2, 3, 5, 200, 'blue'),
('greenwood_b', 3, 4, 3, 440, 'blue'),
('greenwood_b', 4, 5, 2, 550, 'blue'),
('greenwood_b', 5, 3, 9, 214, 'blue'),
('greenwood_b', 6, 4, 7, 374, 'blue'),
('greenwood_b', 7, 4, 1, 427, 'blue'),
('greenwood_b', 8, 5, 4, 519, 'blue'),
('greenwood_b', 9, 4, 6, 383, 'blue'),

-- White Tees
('greenwood_b', 1, 4, 8, 343, 'white'),
('greenwood_b', 2, 3, 5, 180, 'white'),
('greenwood_b', 3, 4, 3, 413, 'white'),
('greenwood_b', 4, 5, 2, 525, 'white'),
('greenwood_b', 5, 3, 9, 177, 'white'),
('greenwood_b', 6, 4, 7, 352, 'white'),
('greenwood_b', 7, 4, 1, 402, 'white'),
('greenwood_b', 8, 5, 4, 497, 'white'),
('greenwood_b', 9, 4, 6, 358, 'white'),

-- Yellow Tees
('greenwood_b', 1, 4, 8, 281, 'yellow'),
('greenwood_b', 2, 3, 5, 149, 'yellow'),
('greenwood_b', 3, 4, 3, 375, 'yellow'),
('greenwood_b', 4, 5, 2, 510, 'yellow'),
('greenwood_b', 5, 3, 9, 150, 'yellow'),
('greenwood_b', 6, 4, 7, 339, 'yellow'),
('greenwood_b', 7, 4, 1, 364, 'yellow'),
('greenwood_b', 8, 5, 4, 441, 'yellow'),
('greenwood_b', 9, 4, 6, 330, 'yellow'),

-- Red Tees
('greenwood_b', 1, 4, 8, 260, 'red'),
('greenwood_b', 2, 3, 5, 137, 'red'),
('greenwood_b', 3, 4, 3, 354, 'red'),
('greenwood_b', 4, 5, 2, 473, 'red'),
('greenwood_b', 5, 3, 9, 112, 'red'),
('greenwood_b', 6, 4, 7, 323, 'red'),
('greenwood_b', 7, 4, 1, 341, 'red'),
('greenwood_b', 8, 5, 4, 417, 'red'),
('greenwood_b', 9, 4, 6, 311, 'red');

-- =====================================================================
-- COURSE C (9 holes) - From Official Scorecard
-- Par: 4, 4, 3, 5, 4, 3, 5, 4, 4 = 36
-- Stroke Index: 2, 8, 6, 4, 7, 9, 5, 3, 1
-- =====================================================================

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
-- Blue Tees
('greenwood_c', 1, 4, 2, 436, 'blue'),
('greenwood_c', 2, 4, 8, 390, 'blue'),
('greenwood_c', 3, 3, 6, 215, 'blue'),
('greenwood_c', 4, 5, 4, 554, 'blue'),
('greenwood_c', 5, 4, 7, 378, 'blue'),
('greenwood_c', 6, 3, 9, 167, 'blue'),
('greenwood_c', 7, 5, 5, 562, 'blue'),
('greenwood_c', 8, 4, 3, 436, 'blue'),
('greenwood_c', 9, 4, 1, 427, 'blue'),

-- White Tees
('greenwood_c', 1, 4, 2, 406, 'white'),
('greenwood_c', 2, 4, 8, 360, 'white'),
('greenwood_c', 3, 3, 6, 200, 'white'),
('greenwood_c', 4, 5, 4, 527, 'white'),
('greenwood_c', 5, 4, 7, 365, 'white'),
('greenwood_c', 6, 3, 9, 150, 'white'),
('greenwood_c', 7, 5, 5, 530, 'white'),
('greenwood_c', 8, 4, 3, 402, 'white'),
('greenwood_c', 9, 4, 1, 412, 'white'),

-- Yellow Tees
('greenwood_c', 1, 4, 2, 387, 'yellow'),
('greenwood_c', 2, 4, 8, 334, 'yellow'),
('greenwood_c', 3, 3, 6, 184, 'yellow'),
('greenwood_c', 4, 5, 4, 501, 'yellow'),
('greenwood_c', 5, 4, 7, 323, 'yellow'),
('greenwood_c', 6, 3, 9, 129, 'yellow'),
('greenwood_c', 7, 5, 5, 507, 'yellow'),
('greenwood_c', 8, 4, 3, 389, 'yellow'),
('greenwood_c', 9, 4, 1, 385, 'yellow'),

-- Red Tees
('greenwood_c', 1, 4, 2, 361, 'red'),
('greenwood_c', 2, 4, 8, 318, 'red'),
('greenwood_c', 3, 3, 6, 169, 'red'),
('greenwood_c', 4, 5, 4, 487, 'red'),
('greenwood_c', 5, 4, 7, 292, 'red'),
('greenwood_c', 6, 3, 9, 116, 'red'),
('greenwood_c', 7, 5, 5, 481, 'red'),
('greenwood_c', 8, 4, 3, 358, 'red'),
('greenwood_c', 9, 4, 1, 380, 'red');

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

-- Check yardage totals match scorecard
SELECT course_id, tee_marker, SUM(yardage) as total_yardage
FROM course_holes
WHERE course_id LIKE 'greenwood_%'
GROUP BY course_id, tee_marker
ORDER BY course_id, tee_marker;
