-- =====================================================
-- Pattaya Country Club - Complete Tee Marker Data
-- =====================================================
-- This file contains ALL tee markers from the scorecard
-- Total: 5 tee markers (Black, Gold, White, Yellow, Blue/Lady)
-- =====================================================

-- Delete existing data for this course
DELETE FROM course_holes WHERE course_id = 'pattaya_country_club';

-- =====================================================
-- BLACK TEES (Championship) - Total: 7054 yards
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('pattaya_country_club', 1, 4, 5, 464, 'Black'),
('pattaya_country_club', 2, 4, 3, 402, 'Black'),
('pattaya_country_club', 3, 5, 13, 531, 'Black'),
('pattaya_country_club', 4, 4, 7, 445, 'Black'),
('pattaya_country_club', 5, 3, 17, 208, 'Black'),
('pattaya_country_club', 6, 4, 15, 375, 'Black'),
('pattaya_country_club', 7, 3, 9, 212, 'Black'),
('pattaya_country_club', 8, 5, 11, 557, 'Black'),
('pattaya_country_club', 9, 4, 1, 446, 'Black'),
('pattaya_country_club', 10, 4, 10, 396, 'Black'),
('pattaya_country_club', 11, 5, 8, 520, 'Black'),
('pattaya_country_club', 12, 3, 18, 155, 'Black'),
('pattaya_country_club', 13, 4, 6, 365, 'Black'),
('pattaya_country_club', 14, 4, 4, 438, 'Black'),
('pattaya_country_club', 15, 4, 16, 379, 'Black'),
('pattaya_country_club', 16, 3, 12, 189, 'Black'),
('pattaya_country_club', 17, 4, 2, 438, 'Black'),
('pattaya_country_club', 18, 5, 14, 514, 'Black');

-- =====================================================
-- GOLD TEES - Total: 6648 yards
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('pattaya_country_club', 1, 4, 5, 436, 'Gold'),
('pattaya_country_club', 2, 4, 3, 392, 'Gold'),
('pattaya_country_club', 3, 5, 13, 507, 'Gold'),
('pattaya_country_club', 4, 4, 7, 421, 'Gold'),
('pattaya_country_club', 5, 3, 17, 185, 'Gold'),
('pattaya_country_club', 6, 4, 15, 354, 'Gold'),
('pattaya_country_club', 7, 3, 9, 188, 'Gold'),
('pattaya_country_club', 8, 5, 11, 525, 'Gold'),
('pattaya_country_club', 9, 4, 1, 414, 'Gold'),
('pattaya_country_club', 10, 4, 10, 367, 'Gold'),
('pattaya_country_club', 11, 5, 8, 505, 'Gold'),
('pattaya_country_club', 12, 3, 18, 150, 'Gold'),
('pattaya_country_club', 13, 4, 6, 352, 'Gold'),
('pattaya_country_club', 14, 4, 4, 409, 'Gold'),
('pattaya_country_club', 15, 4, 16, 364, 'Gold'),
('pattaya_country_club', 16, 3, 12, 177, 'Gold'),
('pattaya_country_club', 17, 4, 2, 408, 'Gold'),
('pattaya_country_club', 18, 5, 14, 494, 'Gold');

-- =====================================================
-- WHITE TEES - Total: 6171 yards
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('pattaya_country_club', 1, 4, 5, 398, 'White'),
('pattaya_country_club', 2, 4, 3, 357, 'White'),
('pattaya_country_club', 3, 5, 13, 488, 'White'),
('pattaya_country_club', 4, 4, 7, 404, 'White'),
('pattaya_country_club', 5, 3, 17, 178, 'White'),
('pattaya_country_club', 6, 4, 15, 308, 'White'),
('pattaya_country_club', 7, 3, 9, 177, 'White'),
('pattaya_country_club', 8, 5, 11, 481, 'White'),
('pattaya_country_club', 9, 4, 1, 414, 'White'),
('pattaya_country_club', 10, 4, 10, 323, 'White'),
('pattaya_country_club', 11, 5, 8, 461, 'White'),
('pattaya_country_club', 12, 3, 18, 137, 'White'),
('pattaya_country_club', 13, 4, 6, 341, 'White'),
('pattaya_country_club', 14, 4, 4, 350, 'White'),
('pattaya_country_club', 15, 4, 16, 341, 'White'),
('pattaya_country_club', 16, 3, 12, 164, 'White'),
('pattaya_country_club', 17, 4, 2, 381, 'White'),
('pattaya_country_club', 18, 5, 14, 473, 'White');

-- =====================================================
-- YELLOW TEES - Total: 5554 yards
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('pattaya_country_club', 1, 4, 5, 345, 'Yellow'),
('pattaya_country_club', 2, 4, 3, 302, 'Yellow'),
('pattaya_country_club', 3, 5, 13, 477, 'Yellow'),
('pattaya_country_club', 4, 4, 7, 388, 'Yellow'),
('pattaya_country_club', 5, 3, 17, 168, 'Yellow'),
('pattaya_country_club', 6, 4, 15, 280, 'Yellow'),
('pattaya_country_club', 7, 3, 9, 150, 'Yellow'),
('pattaya_country_club', 8, 5, 11, 458, 'Yellow'),
('pattaya_country_club', 9, 4, 1, 383, 'Yellow'),
('pattaya_country_club', 10, 4, 10, 312, 'Yellow'),
('pattaya_country_club', 11, 5, 8, 452, 'Yellow'),
('pattaya_country_club', 12, 3, 18, 121, 'Yellow'),
('pattaya_country_club', 13, 4, 6, 328, 'Yellow'),
('pattaya_country_club', 14, 4, 4, 330, 'Yellow'),
('pattaya_country_club', 15, 4, 16, 331, 'Yellow'),
('pattaya_country_club', 16, 3, 12, 146, 'Yellow'),
('pattaya_country_club', 17, 4, 2, 371, 'Yellow'),
('pattaya_country_club', 18, 5, 14, 458, 'Yellow');

-- =====================================================
-- BLUE/LADY TEES - Total: 5393 yards
-- =====================================================
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('pattaya_country_club', 1, 4, 5, 342, 'Blue'),
('pattaya_country_club', 2, 4, 3, 335, 'Blue'),
('pattaya_country_club', 3, 5, 13, 482, 'Blue'),
('pattaya_country_club', 4, 4, 7, 358, 'Blue'),
('pattaya_country_club', 5, 3, 17, 155, 'Blue'),
('pattaya_country_club', 6, 4, 15, 231, 'Blue'),
('pattaya_country_club', 7, 3, 9, 141, 'Blue'),
('pattaya_country_club', 8, 5, 11, 427, 'Blue'),
('pattaya_country_club', 9, 4, 1, 322, 'Blue'),
('pattaya_country_club', 10, 4, 10, 293, 'Blue'),
('pattaya_country_club', 11, 5, 8, 440, 'Blue'),
('pattaya_country_club', 12, 3, 18, 115, 'Blue'),
('pattaya_country_club', 13, 4, 6, 311, 'Blue'),
('pattaya_country_club', 14, 4, 4, 282, 'Blue'),
('pattaya_country_club', 15, 4, 16, 280, 'Blue'),
('pattaya_country_club', 16, 3, 12, 138, 'Blue'),
('pattaya_country_club', 17, 4, 2, 340, 'Blue'),
('pattaya_country_club', 18, 5, 14, 425, 'Blue');

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check total holes inserted (should be 90: 5 tees x 18 holes)
SELECT
    'Total Holes Inserted' as check_type,
    COUNT(*) as count,
    CASE
        WHEN COUNT(*) = 90 THEN 'PASS'
        ELSE 'FAIL'
    END as status
FROM course_holes
WHERE course_id = 'pattaya_country_club';

-- Verify yardage totals for each tee marker
SELECT
    tee_marker,
    COUNT(*) as holes,
    SUM(yardage) as total_yardage,
    SUM(par) as total_par
FROM course_holes
WHERE course_id = 'pattaya_country_club'
GROUP BY tee_marker
ORDER BY SUM(yardage) DESC;

-- Expected totals:
-- Black: 7054 yards, Par 72
-- Gold: 6648 yards, Par 72
-- White: 6171 yards, Par 72 (HCP NET)
-- Yellow: 5554 yards, Par 72
-- Blue: 5393 yards, Par 72

-- Verify par distribution for each tee
SELECT
    tee_marker,
    par,
    COUNT(*) as hole_count
FROM course_holes
WHERE course_id = 'pattaya_country_club'
GROUP BY tee_marker, par
ORDER BY tee_marker, par;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT '=============================================' as message
UNION ALL SELECT 'Pattaya Country Club - Data Import Complete'
UNION ALL SELECT '============================================='
UNION ALL SELECT 'Black Tees: 7054 yards'
UNION ALL SELECT 'Gold Tees: 6648 yards'
UNION ALL SELECT 'White Tees: 6171 yards'
UNION ALL SELECT 'Yellow Tees: 5554 yards'
UNION ALL SELECT 'Blue Tees: 5393 yards'
UNION ALL SELECT '============================================='
UNION ALL SELECT 'Total: 90 holes (5 tee markers x 18 holes)'
UNION ALL SELECT 'All tees: Par 72'
UNION ALL SELECT '=============================================';
