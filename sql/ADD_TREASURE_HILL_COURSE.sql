-- ============================================================================
-- ADD TREASURE HILL GOLF & COUNTRY CLUB
-- ============================================================================
-- Course ID: treasure_hill (must match Supabase storage folder name)
-- Location: Chonburi, Thailand
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
        {"name": "Black", "color": "Black", "par": 72, "rating": 73.5, "slope": 132, "yardage": 6850},
        {"name": "Blue", "color": "Blue", "par": 72, "rating": 71.8, "slope": 128, "yardage": 6400},
        {"name": "White", "color": "White", "par": 72, "rating": 70.0, "slope": 124, "yardage": 6000},
        {"name": "Yellow", "color": "Yellow", "par": 72, "rating": 68.5, "slope": 120, "yardage": 5600},
        {"name": "Red", "color": "Red", "par": 72, "rating": 67.0, "slope": 116, "yardage": 5200}
    ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    location = EXCLUDED.location,
    tees = EXCLUDED.tees,
    updated_at = NOW();

-- Step 2: Delete existing holes (if re-running)
DELETE FROM course_holes WHERE course_id = 'treasure_hill';

-- Step 3: Insert hole data for WHITE tees
-- IMPORTANT: Update par and stroke_index values based on actual scorecard!
INSERT INTO course_holes (course_id, hole_number, tee_marker, par, stroke_index, yardage) VALUES
-- Front 9
('treasure_hill', 1, 'white', 4, 7, 380),
('treasure_hill', 2, 'white', 4, 11, 350),
('treasure_hill', 3, 'white', 3, 15, 165),
('treasure_hill', 4, 'white', 5, 1, 510),
('treasure_hill', 5, 'white', 4, 9, 370),
('treasure_hill', 6, 'white', 4, 5, 400),
('treasure_hill', 7, 'white', 3, 17, 155),
('treasure_hill', 8, 'white', 5, 3, 520),
('treasure_hill', 9, 'white', 4, 13, 360),
-- Back 9
('treasure_hill', 10, 'white', 4, 8, 385),
('treasure_hill', 11, 'white', 3, 16, 170),
('treasure_hill', 12, 'white', 5, 2, 530),
('treasure_hill', 13, 'white', 4, 10, 365),
('treasure_hill', 14, 'white', 4, 6, 395),
('treasure_hill', 15, 'white', 3, 18, 145),
('treasure_hill', 16, 'white', 5, 4, 515),
('treasure_hill', 17, 'white', 4, 12, 355),
('treasure_hill', 18, 'white', 4, 14, 345);

-- Step 4: Insert hole data for BLUE tees
INSERT INTO course_holes (course_id, hole_number, tee_marker, par, stroke_index, yardage) VALUES
-- Front 9
('treasure_hill', 1, 'blue', 4, 7, 410),
('treasure_hill', 2, 'blue', 4, 11, 380),
('treasure_hill', 3, 'blue', 3, 15, 185),
('treasure_hill', 4, 'blue', 5, 1, 550),
('treasure_hill', 5, 'blue', 4, 9, 400),
('treasure_hill', 6, 'blue', 4, 5, 430),
('treasure_hill', 7, 'blue', 3, 17, 175),
('treasure_hill', 8, 'blue', 5, 3, 560),
('treasure_hill', 9, 'blue', 4, 13, 390),
-- Back 9
('treasure_hill', 10, 'blue', 4, 8, 415),
('treasure_hill', 11, 'blue', 3, 16, 190),
('treasure_hill', 12, 'blue', 5, 2, 570),
('treasure_hill', 13, 'blue', 4, 10, 395),
('treasure_hill', 14, 'blue', 4, 6, 425),
('treasure_hill', 15, 'blue', 3, 18, 165),
('treasure_hill', 16, 'blue', 5, 4, 555),
('treasure_hill', 17, 'blue', 4, 12, 385),
('treasure_hill', 18, 'blue', 4, 14, 375);

-- Step 5: Insert hole data for YELLOW tees
INSERT INTO course_holes (course_id, hole_number, tee_marker, par, stroke_index, yardage) VALUES
-- Front 9
('treasure_hill', 1, 'yellow', 4, 7, 350),
('treasure_hill', 2, 'yellow', 4, 11, 320),
('treasure_hill', 3, 'yellow', 3, 15, 145),
('treasure_hill', 4, 'yellow', 5, 1, 470),
('treasure_hill', 5, 'yellow', 4, 9, 340),
('treasure_hill', 6, 'yellow', 4, 5, 370),
('treasure_hill', 7, 'yellow', 3, 17, 135),
('treasure_hill', 8, 'yellow', 5, 3, 480),
('treasure_hill', 9, 'yellow', 4, 13, 330),
-- Back 9
('treasure_hill', 10, 'yellow', 4, 8, 355),
('treasure_hill', 11, 'yellow', 3, 16, 150),
('treasure_hill', 12, 'yellow', 5, 2, 490),
('treasure_hill', 13, 'yellow', 4, 10, 335),
('treasure_hill', 14, 'yellow', 4, 6, 365),
('treasure_hill', 15, 'yellow', 3, 18, 125),
('treasure_hill', 16, 'yellow', 5, 4, 475),
('treasure_hill', 17, 'yellow', 4, 12, 325),
('treasure_hill', 18, 'yellow', 4, 14, 315);

-- Step 6: Insert hole data for RED tees
INSERT INTO course_holes (course_id, hole_number, tee_marker, par, stroke_index, yardage) VALUES
-- Front 9
('treasure_hill', 1, 'red', 4, 7, 320),
('treasure_hill', 2, 'red', 4, 11, 290),
('treasure_hill', 3, 'red', 3, 15, 125),
('treasure_hill', 4, 'red', 5, 1, 430),
('treasure_hill', 5, 'red', 4, 9, 310),
('treasure_hill', 6, 'red', 4, 5, 340),
('treasure_hill', 7, 'red', 3, 17, 115),
('treasure_hill', 8, 'red', 5, 3, 440),
('treasure_hill', 9, 'red', 4, 13, 300),
-- Back 9
('treasure_hill', 10, 'red', 4, 8, 325),
('treasure_hill', 11, 'red', 3, 16, 130),
('treasure_hill', 12, 'red', 5, 2, 450),
('treasure_hill', 13, 'red', 4, 10, 305),
('treasure_hill', 14, 'red', 4, 6, 335),
('treasure_hill', 15, 'red', 3, 18, 105),
('treasure_hill', 16, 'red', 5, 4, 435),
('treasure_hill', 17, 'red', 4, 12, 295),
('treasure_hill', 18, 'red', 4, 14, 285);

-- Verify the insert
SELECT 'COURSE ADDED:' as status, name, par, total_holes
FROM courses WHERE id = 'treasure_hill';

SELECT 'HOLES BY TEE:' as status, tee_marker, COUNT(*) as holes, SUM(par) as total_par
FROM course_holes
WHERE course_id = 'treasure_hill'
GROUP BY tee_marker
ORDER BY tee_marker;

-- ============================================================================
-- HOLE IMAGES
-- ============================================================================
-- Upload hole images to Supabase Storage:
-- Bucket: hole-layouts
-- Path: treasure_hill/hole1.png, treasure_hill/hole2.png, ... treasure_hill/hole18.png
--
-- Supported naming formats:
--   hole1.png, hole1.jpg, hole1.webp
--   hole_1.png, hole-1.png
--   hole-1-1086x1536.png (with dimensions)
-- ============================================================================
