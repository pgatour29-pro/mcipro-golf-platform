-- ===========================================================================
-- FIX BANGPAKONG BACK NINE STROKE INDICES
-- ===========================================================================
-- Date: October 15, 2025
-- Issue: Holes 10-18 have incorrect stroke indices
-- Impact: Scorecard calculations wrong for back nine
-- ===========================================================================

BEGIN;

-- Fix Bangpakong back nine stroke indices for white tees
UPDATE course_holes
SET stroke_index = CASE hole_number
    WHEN 10 THEN 9
    WHEN 11 THEN 7
    WHEN 12 THEN 3
    WHEN 13 THEN 17
    WHEN 14 THEN 5
    WHEN 15 THEN 11
    WHEN 16 THEN 15
    WHEN 17 THEN 13
    WHEN 18 THEN 1
END
WHERE course_id = 'bangpakong'
  AND tee_marker = 'white'
  AND hole_number BETWEEN 10 AND 18;

-- Verify the fix
SELECT
    'Bangpakong Back Nine Fix' as verification,
    hole_number,
    par,
    stroke_index,
    yardage,
    CASE
        WHEN (hole_number = 10 AND stroke_index = 9) OR
             (hole_number = 11 AND stroke_index = 7) OR
             (hole_number = 12 AND stroke_index = 3) OR
             (hole_number = 13 AND stroke_index = 17) OR
             (hole_number = 14 AND stroke_index = 5) OR
             (hole_number = 15 AND stroke_index = 11) OR
             (hole_number = 16 AND stroke_index = 15) OR
             (hole_number = 17 AND stroke_index = 13) OR
             (hole_number = 18 AND stroke_index = 1)
        THEN 'PASS ✓'
        ELSE 'FAIL ✗'
    END as status
FROM course_holes
WHERE course_id = 'bangpakong'
  AND tee_marker = 'white'
  AND hole_number BETWEEN 10 AND 18
ORDER BY hole_number;

COMMIT;

-- ===========================================================================
-- NEXT STEP: Clear cached course data in browser
-- ===========================================================================
-- Run in browser console:
-- localStorage.removeItem('mcipro_course_bangpakong');
-- location.reload();
-- ===========================================================================
