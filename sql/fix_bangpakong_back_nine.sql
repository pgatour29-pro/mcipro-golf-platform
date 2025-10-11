-- =====================================================================
-- FIX: Bangpakong Back Nine Stroke Indices
-- =====================================================================
-- Issue: Back nine holes (10-18) have incorrect stroke indices
-- Date: 2025-10-11
-- Verified from: scorecard_profiles/Bangpakong.jpg
-- =====================================================================

-- Fix stroke indices for holes 10-18
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

-- Verify the fix - should show all 18 holes with correct indices
SELECT
    hole_number,
    par,
    stroke_index,
    yardage,
    tee_marker
FROM course_holes
WHERE course_id = 'bangpakong'
  AND tee_marker = 'white'
ORDER BY hole_number;

-- Expected Results:
-- Hole 1:  Par 4, Index 14
-- Hole 2:  Par 4, Index 12
-- Hole 3:  Par 5, Index 4
-- Hole 4:  Par 3, Index 18
-- Hole 5:  Par 4, Index 8
-- Hole 6:  Par 5, Index 2
-- Hole 7:  Par 4, Index 10
-- Hole 8:  Par 4, Index 6
-- Hole 9:  Par 3, Index 16
-- Hole 10: Par 4, Index 9  ← FIXED
-- Hole 11: Par 4, Index 7  ← FIXED
-- Hole 12: Par 4, Index 3  ← FIXED
-- Hole 13: Par 3, Index 17 ← FIXED
-- Hole 14: Par 5, Index 5  ← FIXED
-- Hole 15: Par 3, Index 11 ← FIXED
-- Hole 16: Par 4, Index 15 ← FIXED
-- Hole 17: Par 4, Index 13 ← FIXED
-- Hole 18: Par 5, Index 1  ← FIXED

-- Total Par: 71 (Front 9: 36, Back 9: 35)

-- =====================================================================
-- IMPORTANT: After running this SQL:
-- 1. Clear course cache: localStorage.removeItem('mcipro_course_bangpakong')
-- 2. Hard refresh the app (Ctrl+Shift+R)
-- 3. Start a new round at Bangpakong to verify
-- 4. Check that handicap strokes are applied correctly
-- =====================================================================
