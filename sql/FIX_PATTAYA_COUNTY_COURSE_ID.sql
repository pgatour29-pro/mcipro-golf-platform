-- =====================================================
-- FIX: Pattaya Country Club - Correct Course ID
-- =====================================================
-- Problem: Code uses 'pattaya_county' but data was inserted as 'pattaya_country_club'
-- Solution: Delete old data and insert with correct course_id
-- =====================================================

-- Delete existing data for BOTH course IDs (cleanup)
DELETE FROM course_holes WHERE course_id IN ('pattaya_county', 'pattaya_country_club');
DELETE FROM courses WHERE id IN ('pattaya_county', 'pattaya_country_club');

-- Insert into courses table first (required for foreign key)
INSERT INTO courses (id, name) VALUES ('pattaya_county', 'Pattaya Country Club')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- =====================================================
-- BLACK TEES (Championship) - Total: 7054 yards
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('pattaya_county', 1, 4, 5, 464, 'black'),
('pattaya_county', 2, 4, 3, 402, 'black'),
('pattaya_county', 3, 5, 13, 531, 'black'),
('pattaya_county', 4, 4, 7, 445, 'black'),
('pattaya_county', 5, 3, 17, 208, 'black'),
('pattaya_county', 6, 4, 15, 375, 'black'),
('pattaya_county', 7, 3, 9, 212, 'black'),
('pattaya_county', 8, 5, 11, 557, 'black'),
('pattaya_county', 9, 4, 1, 446, 'black'),
('pattaya_county', 10, 4, 10, 396, 'black'),
('pattaya_county', 11, 5, 8, 520, 'black'),
('pattaya_county', 12, 3, 18, 155, 'black'),
('pattaya_county', 13, 4, 6, 365, 'black'),
('pattaya_county', 14, 4, 4, 438, 'black'),
('pattaya_county', 15, 4, 16, 379, 'black'),
('pattaya_county', 16, 3, 12, 189, 'black'),
('pattaya_county', 17, 4, 2, 438, 'black'),
('pattaya_county', 18, 5, 14, 514, 'black');

-- =====================================================
-- GOLD TEES - Total: 6648 yards
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('pattaya_county', 1, 4, 5, 436, 'gold'),
('pattaya_county', 2, 4, 3, 392, 'gold'),
('pattaya_county', 3, 5, 13, 507, 'gold'),
('pattaya_county', 4, 4, 7, 421, 'gold'),
('pattaya_county', 5, 3, 17, 185, 'gold'),
('pattaya_county', 6, 4, 15, 354, 'gold'),
('pattaya_county', 7, 3, 9, 188, 'gold'),
('pattaya_county', 8, 5, 11, 525, 'gold'),
('pattaya_county', 9, 4, 1, 414, 'gold'),
('pattaya_county', 10, 4, 10, 367, 'gold'),
('pattaya_county', 11, 5, 8, 505, 'gold'),
('pattaya_county', 12, 3, 18, 150, 'gold'),
('pattaya_county', 13, 4, 6, 352, 'gold'),
('pattaya_county', 14, 4, 4, 409, 'gold'),
('pattaya_county', 15, 4, 16, 364, 'gold'),
('pattaya_county', 16, 3, 12, 177, 'gold'),
('pattaya_county', 17, 4, 2, 408, 'gold'),
('pattaya_county', 18, 5, 14, 494, 'gold');

-- =====================================================
-- WHITE TEES - Total: 6171 yards
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('pattaya_county', 1, 4, 5, 398, 'white'),
('pattaya_county', 2, 4, 3, 357, 'white'),
('pattaya_county', 3, 5, 13, 488, 'white'),
('pattaya_county', 4, 4, 7, 404, 'white'),
('pattaya_county', 5, 3, 17, 178, 'white'),
('pattaya_county', 6, 4, 15, 308, 'white'),
('pattaya_county', 7, 3, 9, 177, 'white'),
('pattaya_county', 8, 5, 11, 481, 'white'),
('pattaya_county', 9, 4, 1, 414, 'white'),
('pattaya_county', 10, 4, 10, 323, 'white'),
('pattaya_county', 11, 5, 8, 461, 'white'),
('pattaya_county', 12, 3, 18, 137, 'white'),
('pattaya_county', 13, 4, 6, 341, 'white'),
('pattaya_county', 14, 4, 4, 350, 'white'),
('pattaya_county', 15, 4, 16, 341, 'white'),
('pattaya_county', 16, 3, 12, 164, 'white'),
('pattaya_county', 17, 4, 2, 381, 'white'),
('pattaya_county', 18, 5, 14, 473, 'white');

-- =====================================================
-- YELLOW TEES - Total: 5554 yards
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('pattaya_county', 1, 4, 5, 345, 'yellow'),
('pattaya_county', 2, 4, 3, 302, 'yellow'),
('pattaya_county', 3, 5, 13, 477, 'yellow'),
('pattaya_county', 4, 4, 7, 388, 'yellow'),
('pattaya_county', 5, 3, 17, 168, 'yellow'),
('pattaya_county', 6, 4, 15, 280, 'yellow'),
('pattaya_county', 7, 3, 9, 150, 'yellow'),
('pattaya_county', 8, 5, 11, 458, 'yellow'),
('pattaya_county', 9, 4, 1, 383, 'yellow'),
('pattaya_county', 10, 4, 10, 312, 'yellow'),
('pattaya_county', 11, 5, 8, 452, 'yellow'),
('pattaya_county', 12, 3, 18, 121, 'yellow'),
('pattaya_county', 13, 4, 6, 328, 'yellow'),
('pattaya_county', 14, 4, 4, 330, 'yellow'),
('pattaya_county', 15, 4, 16, 331, 'yellow'),
('pattaya_county', 16, 3, 12, 146, 'yellow'),
('pattaya_county', 17, 4, 2, 371, 'yellow'),
('pattaya_county', 18, 5, 14, 451, 'yellow');

-- =====================================================
-- BLUE/LADY TEES - Total: 5065 yards
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('pattaya_county', 1, 4, 5, 312, 'blue'),
('pattaya_county', 2, 4, 3, 263, 'blue'),
('pattaya_county', 3, 5, 13, 447, 'blue'),
('pattaya_county', 4, 4, 7, 353, 'blue'),
('pattaya_county', 5, 3, 17, 144, 'blue'),
('pattaya_county', 6, 4, 15, 260, 'blue'),
('pattaya_county', 7, 3, 9, 139, 'blue'),
('pattaya_county', 8, 5, 11, 425, 'blue'),
('pattaya_county', 9, 4, 1, 361, 'blue'),
('pattaya_county', 10, 4, 10, 297, 'blue'),
('pattaya_county', 11, 5, 8, 424, 'blue'),
('pattaya_county', 12, 3, 18, 108, 'blue'),
('pattaya_county', 13, 4, 6, 290, 'blue'),
('pattaya_county', 14, 4, 4, 306, 'blue'),
('pattaya_county', 15, 4, 16, 304, 'blue'),
('pattaya_county', 16, 3, 12, 123, 'blue'),
('pattaya_county', 17, 4, 2, 344, 'blue'),
('pattaya_county', 18, 5, 14, 425, 'blue');

-- Verify the data was inserted correctly
SELECT
    'VERIFICATION' as status,
    tee_marker,
    COUNT(*) as holes,
    SUM(yardage) as total_yardage
FROM course_holes
WHERE course_id = 'pattaya_county'
GROUP BY tee_marker
ORDER BY tee_marker;
