-- ============================================================================
-- ADD TREASURE HILL GOLF & COUNTRY CLUB
-- ============================================================================
-- Course ID: treasure_hill
-- Location: Chonburi, Thailand
-- Par 72 (Out 36, In 36)
-- ============================================================================

-- Step 1: Insert the course
INSERT INTO courses (id, name, location, country, total_holes, par, course_code, tees)
VALUES (
    'treasure_hill',
    'Treasure Hill Golf & Country Club',
    'Chonburi',
    'Thailand',
    18,
    72,
    'treasure_hill',
    '[
        {"name": "Black", "color": "Black", "par": 72, "rating": 73.5, "slope": 135, "yardage": 7241},
        {"name": "White", "color": "White", "par": 72, "rating": 72.0, "slope": 130, "yardage": 6726},
        {"name": "Yellow", "color": "Yellow", "par": 72, "rating": 70.0, "slope": 125, "yardage": 6377},
        {"name": "Red", "color": "Red", "par": 72, "rating": 68.0, "slope": 120, "yardage": 5592}
    ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    location = EXCLUDED.location,
    tees = EXCLUDED.tees,
    updated_at = NOW();

-- Step 2: Delete existing holes (if re-running)
DELETE FROM course_holes WHERE course_id = 'treasure_hill';

-- Step 3: Insert hole data for BLACK tees
INSERT INTO course_holes (course_id, hole_number, tee_marker, par, stroke_index, yardage) VALUES
('treasure_hill', 1, 'black', 5, 12, 600),
('treasure_hill', 2, 'black', 3, 2, 235),
('treasure_hill', 3, 'black', 4, 17, 407),
('treasure_hill', 4, 'black', 4, 3, 418),
('treasure_hill', 5, 'black', 4, 5, 413),
('treasure_hill', 6, 'black', 3, 18, 140),
('treasure_hill', 7, 'black', 5, 13, 557),
('treasure_hill', 8, 'black', 4, 8, 404),
('treasure_hill', 9, 'black', 4, 4, 439),
('treasure_hill', 10, 'black', 4, 10, 405),
('treasure_hill', 11, 'black', 4, 1, 472),
('treasure_hill', 12, 'black', 5, 11, 607),
('treasure_hill', 13, 'black', 3, 7, 252),
('treasure_hill', 14, 'black', 4, 9, 405),
('treasure_hill', 15, 'black', 4, 16, 361),
('treasure_hill', 16, 'black', 5, 15, 549),
('treasure_hill', 17, 'black', 3, 14, 175),
('treasure_hill', 18, 'black', 4, 6, 402);

-- Step 4: Insert hole data for WHITE tees
INSERT INTO course_holes (course_id, hole_number, tee_marker, par, stroke_index, yardage) VALUES
('treasure_hill', 1, 'white', 5, 12, 576),
('treasure_hill', 2, 'white', 3, 2, 213),
('treasure_hill', 3, 'white', 4, 17, 376),
('treasure_hill', 4, 'white', 4, 3, 388),
('treasure_hill', 5, 'white', 4, 5, 376),
('treasure_hill', 6, 'white', 3, 18, 114),
('treasure_hill', 7, 'white', 5, 13, 514),
('treasure_hill', 8, 'white', 4, 8, 363),
('treasure_hill', 9, 'white', 4, 4, 415),
('treasure_hill', 10, 'white', 4, 10, 382),
('treasure_hill', 11, 'white', 4, 1, 442),
('treasure_hill', 12, 'white', 5, 11, 574),
('treasure_hill', 13, 'white', 3, 7, 200),
('treasure_hill', 14, 'white', 4, 9, 383),
('treasure_hill', 15, 'white', 4, 16, 338),
('treasure_hill', 16, 'white', 5, 15, 532),
('treasure_hill', 17, 'white', 3, 14, 153),
('treasure_hill', 18, 'white', 4, 6, 387);

-- Step 5: Insert hole data for YELLOW tees
INSERT INTO course_holes (course_id, hole_number, tee_marker, par, stroke_index, yardage) VALUES
('treasure_hill', 1, 'yellow', 5, 12, 548),
('treasure_hill', 2, 'yellow', 3, 2, 198),
('treasure_hill', 3, 'yellow', 4, 17, 364),
('treasure_hill', 4, 'yellow', 4, 3, 375),
('treasure_hill', 5, 'yellow', 4, 5, 363),
('treasure_hill', 6, 'yellow', 3, 18, 107),
('treasure_hill', 7, 'yellow', 5, 13, 494),
('treasure_hill', 8, 'yellow', 4, 8, 340),
('treasure_hill', 9, 'yellow', 4, 4, 391),
('treasure_hill', 10, 'yellow', 4, 10, 358),
('treasure_hill', 11, 'yellow', 4, 1, 405),
('treasure_hill', 12, 'yellow', 5, 11, 549),
('treasure_hill', 13, 'yellow', 3, 7, 172),
('treasure_hill', 14, 'yellow', 4, 9, 367),
('treasure_hill', 15, 'yellow', 4, 16, 316),
('treasure_hill', 16, 'yellow', 5, 15, 515),
('treasure_hill', 17, 'yellow', 3, 14, 141),
('treasure_hill', 18, 'yellow', 4, 6, 374);

-- Step 6: Insert hole data for RED tees
INSERT INTO course_holes (course_id, hole_number, tee_marker, par, stroke_index, yardage) VALUES
('treasure_hill', 1, 'red', 5, 12, 501),
('treasure_hill', 2, 'red', 3, 2, 150),
('treasure_hill', 3, 'red', 4, 17, 291),
('treasure_hill', 4, 'red', 4, 3, 326),
('treasure_hill', 5, 'red', 4, 5, 332),
('treasure_hill', 6, 'red', 3, 18, 87),
('treasure_hill', 7, 'red', 5, 13, 467),
('treasure_hill', 8, 'red', 4, 8, 318),
('treasure_hill', 9, 'red', 4, 4, 325),
('treasure_hill', 10, 'red', 4, 10, 312),
('treasure_hill', 11, 'red', 4, 1, 352),
('treasure_hill', 12, 'red', 5, 11, 493),
('treasure_hill', 13, 'red', 3, 7, 159),
('treasure_hill', 14, 'red', 4, 9, 319),
('treasure_hill', 15, 'red', 4, 16, 300),
('treasure_hill', 16, 'red', 5, 15, 467),
('treasure_hill', 17, 'red', 3, 14, 112),
('treasure_hill', 18, 'red', 4, 6, 281);

-- Verify the insert
SELECT 'COURSE ADDED:' as status, name, par, total_holes
FROM courses WHERE id = 'treasure_hill';

SELECT 'HOLES BY TEE:' as status, tee_marker, COUNT(*) as holes, SUM(par) as total_par
FROM course_holes
WHERE course_id = 'treasure_hill'
GROUP BY tee_marker
ORDER BY tee_marker;
