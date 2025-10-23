-- =====================================================================
-- DELETE BAD EASTERN STAR ROUNDS WITH WRONG PARS/STROKE INDEXES
-- =====================================================================
-- These rounds were created with wrong cached course data
-- Delete them so you can create new rounds with correct data
-- =====================================================================

BEGIN;

-- Find all Eastern Star rounds
SELECT
    id,
    golfer_id,
    course_name,
    completed_at,
    total_gross
FROM rounds
WHERE course_id = 'eastern_star'
ORDER BY completed_at DESC;

-- DELETE ALL EASTERN STAR ROUNDS (they have wrong data)
-- Uncomment this line ONLY if you want to delete them:
-- DELETE FROM rounds WHERE course_id = 'eastern_star';

-- Note: round_holes will be automatically deleted due to CASCADE

COMMIT;

-- After deleting:
-- 1. Clear browser cache
-- 2. Run: localStorage.removeItem('mcipro_course_eastern_star')
-- 3. Create NEW round - will load correct data from database
