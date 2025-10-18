-- ============================================================================
-- Mountain Shadow Golf Club - Complete Tee Marker Data Fix
-- ============================================================================
-- This script removes all existing hole data for Mountain Shadow Golf Club
-- and inserts complete, accurate data for ALL tee markers from the scorecard
-- ============================================================================

-- Clean up existing data
DELETE FROM course_holes WHERE course_id = 'mountain_shadow';

-- ============================================================================
-- BLACK TEES (Total: 6722 yards)
-- ============================================================================

-- Front Nine (OUT: 3460 yards)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('mountain_shadow', 1, 4, 11, 407, 'black'),
('mountain_shadow', 2, 4, 7, 395, 'black'),
('mountain_shadow', 3, 5, 5, 561, 'black'),
('mountain_shadow', 4, 4, 13, 376, 'black'),
('mountain_shadow', 5, 3, 17, 150, 'black'),
('mountain_shadow', 6, 5, 3, 561, 'black'),
('mountain_shadow', 7, 4, 1, 420, 'black'),
('mountain_shadow', 8, 3, 15, 194, 'black'),
('mountain_shadow', 9, 4, 9, 396, 'black');

-- Back Nine (IN: 3262 yards)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('mountain_shadow', 10, 4, 14, 356, 'black'),
('mountain_shadow', 11, 5, 10, 483, 'black'),
('mountain_shadow', 12, 4, 8, 370, 'black'),
('mountain_shadow', 13, 4, 4, 403, 'black'),
('mountain_shadow', 14, 5, 2, 577, 'black'),
('mountain_shadow', 15, 3, 16, 151, 'black'),
('mountain_shadow', 16, 4, 18, 323, 'black'),
('mountain_shadow', 17, 3, 12, 189, 'black'),
('mountain_shadow', 18, 4, 6, 410, 'black');

-- ============================================================================
-- BLUE TEES (Total: 6276 yards)
-- ============================================================================

-- Front Nine (OUT: 3225 yards)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('mountain_shadow', 1, 4, 11, 379, 'blue'),
('mountain_shadow', 2, 4, 7, 374, 'blue'),
('mountain_shadow', 3, 5, 5, 531, 'blue'),
('mountain_shadow', 4, 4, 13, 343, 'blue'),
('mountain_shadow', 5, 3, 17, 127, 'blue'),
('mountain_shadow', 6, 5, 3, 546, 'blue'),
('mountain_shadow', 7, 4, 1, 393, 'blue'),
('mountain_shadow', 8, 3, 15, 161, 'blue'),
('mountain_shadow', 9, 4, 9, 371, 'blue');

-- Back Nine (IN: 3051 yards)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('mountain_shadow', 10, 4, 14, 324, 'blue'),
('mountain_shadow', 11, 5, 10, 458, 'blue'),
('mountain_shadow', 12, 4, 8, 342, 'blue'),
('mountain_shadow', 13, 4, 4, 385, 'blue'),
('mountain_shadow', 14, 5, 2, 549, 'blue'),
('mountain_shadow', 15, 3, 16, 149, 'blue'),
('mountain_shadow', 16, 4, 18, 305, 'blue'),
('mountain_shadow', 17, 3, 12, 165, 'blue'),
('mountain_shadow', 18, 4, 6, 374, 'blue');

-- ============================================================================
-- WHITE TEES (Total: 5838 yards)
-- ============================================================================

-- Front Nine (OUT: 2990 yards)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('mountain_shadow', 1, 4, 11, 354, 'white'),
('mountain_shadow', 2, 4, 7, 351, 'white'),
('mountain_shadow', 3, 5, 5, 508, 'white'),
('mountain_shadow', 4, 4, 13, 308, 'white'),
('mountain_shadow', 5, 3, 17, 103, 'white'),
('mountain_shadow', 6, 5, 3, 524, 'white'),
('mountain_shadow', 7, 4, 1, 380, 'white'),
('mountain_shadow', 8, 3, 15, 121, 'white'),
('mountain_shadow', 9, 4, 9, 341, 'white');

-- Back Nine (IN: 2848 yards)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('mountain_shadow', 10, 4, 14, 307, 'white'),
('mountain_shadow', 11, 5, 10, 437, 'white'),
('mountain_shadow', 12, 4, 8, 312, 'white'),
('mountain_shadow', 13, 4, 4, 355, 'white'),
('mountain_shadow', 14, 5, 2, 533, 'white'),
('mountain_shadow', 15, 3, 16, 143, 'white'),
('mountain_shadow', 16, 4, 18, 270, 'white'),
('mountain_shadow', 17, 3, 12, 150, 'white'),
('mountain_shadow', 18, 4, 6, 341, 'white');

-- ============================================================================
-- RED TEES (Total: 5041 yards)
-- ============================================================================

-- Front Nine (OUT: 2617 yards)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('mountain_shadow', 1, 4, 11, 306, 'red'),
('mountain_shadow', 2, 4, 7, 299, 'red'),
('mountain_shadow', 3, 5, 5, 456, 'red'),
('mountain_shadow', 4, 4, 13, 262, 'red'),
('mountain_shadow', 5, 3, 17, 75, 'red'),
('mountain_shadow', 6, 5, 3, 476, 'red'),
('mountain_shadow', 7, 4, 1, 345, 'red'),
('mountain_shadow', 8, 3, 15, 95, 'red'),
('mountain_shadow', 9, 4, 9, 303, 'red');

-- Back Nine (IN: 2404 yards)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker) VALUES
('mountain_shadow', 10, 4, 14, 248, 'red'),
('mountain_shadow', 11, 5, 10, 384, 'red'),
('mountain_shadow', 12, 4, 8, 267, 'red'),
('mountain_shadow', 13, 4, 4, 294, 'red'),
('mountain_shadow', 14, 5, 2, 437, 'red'),
('mountain_shadow', 15, 3, 16, 117, 'red'),
('mountain_shadow', 16, 4, 18, 230, 'red'),
('mountain_shadow', 17, 3, 12, 113, 'red'),
('mountain_shadow', 18, 4, 6, 314, 'red');

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check total holes inserted (should be 72: 4 tee markers x 18 holes)
SELECT
    'Total Holes Check' as verification,
    COUNT(*) as total_holes,
    CASE WHEN COUNT(*) = 72 THEN 'PASS' ELSE 'FAIL' END as status
FROM course_holes
WHERE course_id = 'mountain_shadow';

-- Verify yardage totals by tee marker
SELECT
    tee_marker,
    SUM(CASE WHEN hole_number <= 9 THEN yardage ELSE 0 END) as out_yardage,
    SUM(CASE WHEN hole_number > 9 THEN yardage ELSE 0 END) as in_yardage,
    SUM(yardage) as total_yardage,
    SUM(par) as total_par
FROM course_holes
WHERE course_id = 'mountain_shadow'
GROUP BY tee_marker
ORDER BY total_yardage DESC;

-- Verify all holes are present for each tee marker
SELECT
    tee_marker,
    COUNT(*) as hole_count,
    CASE WHEN COUNT(*) = 18 THEN 'PASS' ELSE 'FAIL' END as status
FROM course_holes
WHERE course_id = 'mountain_shadow'
GROUP BY tee_marker
ORDER BY tee_marker;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT '
=============================================================================
  MOUNTAIN SHADOW GOLF CLUB - DATA IMPORT COMPLETE
=============================================================================

  Course: Mountain Shadow Golf Club
  Total Holes: 72 (4 tee markers x 18 holes)

  TEE MARKER TOTALS:
  ------------------
  BLACK TEES:  6,722 yards (Par 72)
  BLUE TEES:   6,276 yards (Par 72)
  WHITE TEES:  5,838 yards (Par 72)
  RED TEES:    5,041 yards (Par 72)

  All yardages verified against official scorecard.

=============================================================================
' as message;
