-- FIX CORRUPTED STABLEFORD DATA
-- Date: 2025-12-14
-- Issue: Some rounds have impossible stableford values (e.g., 98 pts when max is ~54)

-- Check for corrupted stableford values
SELECT
    id,
    golfer_id,
    course_name,
    total_gross,
    total_stableford,
    played_at
FROM rounds
WHERE total_stableford > 54
ORDER BY played_at DESC;

-- The Eastern Star round for Pete Park has 98 pts which is impossible
-- Let's calculate the correct value from the scores table if available

-- Option 1: If scores exist, recalculate from hole-by-hole data
-- Option 2: Set to NULL if no scores exist (let the system recalculate)

-- For now, let's NULL out the corrupted value
UPDATE rounds
SET total_stableford = NULL
WHERE total_stableford > 54;

-- Verify the fix
SELECT
    golfer_id,
    course_name,
    total_gross,
    total_stableford,
    played_at
FROM rounds
WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
ORDER BY played_at DESC;
