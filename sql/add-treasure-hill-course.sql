-- Add Treasure Hill Golf Course to Live Scoring System
-- Date: 2025-11-16

-- Insert course info into courses table
INSERT INTO courses (id, name, scorecard_url) VALUES
('treasure_hill', 'Treasure Hill Golf & Country Club', '/scorecard_profiles/treasure-hill-scorecard.jpg')
ON CONFLICT (id) DO UPDATE SET
name = EXCLUDED.name,
scorecard_url = EXCLUDED.scorecard_url;

-- Insert hole data for all 18 holes with all 4 tee markers (Black, White, Yellow, Red)
-- Based on scorecard data from treasure_hill_scorecard.json

-- HOLE 1 - Par 5, Handicap 12
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('treasure_hill', 1, 5, 12, 600, 'black'),
('treasure_hill', 1, 5, 12, 576, 'white'),
('treasure_hill', 1, 5, 12, 548, 'yellow'),
('treasure_hill', 1, 5, 12, 501, 'red');

-- HOLE 2 - Par 3, Handicap 2
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('treasure_hill', 2, 3, 2, 235, 'black'),
('treasure_hill', 2, 3, 2, 213, 'white'),
('treasure_hill', 2, 3, 2, 198, 'yellow'),
('treasure_hill', 2, 3, 2, 150, 'red');

-- HOLE 3 - Par 4, Handicap 17
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('treasure_hill', 3, 4, 17, 407, 'black'),
('treasure_hill', 3, 4, 17, 376, 'white'),
('treasure_hill', 3, 4, 17, 364, 'yellow'),
('treasure_hill', 3, 4, 17, 291, 'red');

-- HOLE 4 - Par 4, Handicap 3
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('treasure_hill', 4, 4, 3, 418, 'black'),
('treasure_hill', 4, 4, 3, 388, 'white'),
('treasure_hill', 4, 4, 3, 375, 'yellow'),
('treasure_hill', 4, 4, 3, 326, 'red');

-- HOLE 5 - Par 4, Handicap 5
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('treasure_hill', 5, 4, 5, 413, 'black'),
('treasure_hill', 5, 4, 5, 376, 'white'),
('treasure_hill', 5, 4, 5, 363, 'yellow'),
('treasure_hill', 5, 4, 5, 332, 'red');

-- HOLE 6 - Par 3, Handicap 18
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('treasure_hill', 6, 3, 18, 140, 'black'),
('treasure_hill', 6, 3, 18, 114, 'white'),
('treasure_hill', 6, 3, 18, 107, 'yellow'),
('treasure_hill', 6, 3, 18, 87, 'red');

-- HOLE 7 - Par 5, Handicap 13
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('treasure_hill', 7, 5, 13, 557, 'black'),
('treasure_hill', 7, 5, 13, 514, 'white'),
('treasure_hill', 7, 5, 13, 494, 'yellow'),
('treasure_hill', 7, 5, 13, 467, 'red');

-- HOLE 8 - Par 4, Handicap 8
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('treasure_hill', 8, 4, 8, 404, 'black'),
('treasure_hill', 8, 4, 8, 363, 'white'),
('treasure_hill', 8, 4, 8, 340, 'yellow'),
('treasure_hill', 8, 4, 8, 318, 'red');

-- HOLE 9 - Par 4, Handicap 4
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('treasure_hill', 9, 4, 4, 439, 'black'),
('treasure_hill', 9, 4, 4, 415, 'white'),
('treasure_hill', 9, 4, 4, 391, 'yellow'),
('treasure_hill', 9, 4, 4, 325, 'red');

-- HOLE 10 - Par 4, Handicap 10
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('treasure_hill', 10, 4, 10, 405, 'black'),
('treasure_hill', 10, 4, 10, 382, 'white'),
('treasure_hill', 10, 4, 10, 358, 'yellow'),
('treasure_hill', 10, 4, 10, 312, 'red');

-- HOLE 11 - Par 4, Handicap 1
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('treasure_hill', 11, 4, 1, 472, 'black'),
('treasure_hill', 11, 4, 1, 442, 'white'),
('treasure_hill', 11, 4, 1, 405, 'yellow'),
('treasure_hill', 11, 4, 1, 352, 'red');

-- HOLE 12 - Par 5, Handicap 11
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('treasure_hill', 12, 5, 11, 607, 'black'),
('treasure_hill', 12, 5, 11, 574, 'white'),
('treasure_hill', 12, 5, 11, 549, 'yellow'),
('treasure_hill', 12, 5, 11, 493, 'red');

-- HOLE 13 - Par 3, Handicap 7
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('treasure_hill', 13, 3, 7, 252, 'black'),
('treasure_hill', 13, 3, 7, 200, 'white'),
('treasure_hill', 13, 3, 7, 172, 'yellow'),
('treasure_hill', 13, 3, 7, 159, 'red');

-- HOLE 14 - Par 4, Handicap 9
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('treasure_hill', 14, 4, 9, 405, 'black'),
('treasure_hill', 14, 4, 9, 383, 'white'),
('treasure_hill', 14, 4, 9, 367, 'yellow'),
('treasure_hill', 14, 4, 9, 319, 'red');

-- HOLE 15 - Par 4, Handicap 16
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('treasure_hill', 15, 4, 16, 361, 'black'),
('treasure_hill', 15, 4, 16, 338, 'white'),
('treasure_hill', 15, 4, 16, 316, 'yellow'),
('treasure_hill', 15, 4, 16, 300, 'red');

-- HOLE 16 - Par 5, Handicap 15
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('treasure_hill', 16, 5, 15, 549, 'black'),
('treasure_hill', 16, 5, 15, 532, 'white'),
('treasure_hill', 16, 5, 15, 515, 'yellow'),
('treasure_hill', 16, 5, 15, 467, 'red');

-- HOLE 17 - Par 3, Handicap 14
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('treasure_hill', 17, 3, 14, 175, 'black'),
('treasure_hill', 17, 3, 14, 153, 'white'),
('treasure_hill', 17, 3, 14, 141, 'yellow'),
('treasure_hill', 17, 3, 14, 112, 'red');

-- HOLE 18 - Par 4, Handicap 6
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('treasure_hill', 18, 4, 6, 402, 'black'),
('treasure_hill', 18, 4, 6, 387, 'white'),
('treasure_hill', 18, 4, 6, 374, 'yellow'),
('treasure_hill', 18, 4, 6, 281, 'red');

-- Verify insertion
SELECT 'Course inserted:' AS message, * FROM courses WHERE id = 'treasure_hill';
SELECT 'Total holes inserted:' AS message, COUNT(*) AS count FROM course_holes WHERE course_id = 'treasure_hill';
SELECT 'Holes by tee marker:' AS message, tee_marker, COUNT(*) AS count
FROM course_holes
WHERE course_id = 'treasure_hill'
GROUP BY tee_marker
ORDER BY tee_marker;
