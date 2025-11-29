-- ============================================================================
-- FIX ROUNDS TABLE FOR HANDICAP TRIGGER
-- ============================================================================
-- Problem: Rounds have data in legacy columns (total_score, tee_used, played_at)
--          but NEW columns (total_gross, tee_marker, completed_at) are NULL
-- Solution: Copy legacy column values to new columns so trigger can fire
-- ============================================================================

BEGIN;

-- Update existing rounds to populate new columns from legacy columns
UPDATE public.rounds
SET
  total_gross = total_score,
  tee_marker = tee_used,
  completed_at = played_at
WHERE
  status = 'completed'
  AND total_gross IS NULL
  AND total_score IS NOT NULL;

-- Show what was updated
SELECT
  id,
  golfer_id,
  status,
  total_score AS legacy_total_score,
  total_gross AS new_total_gross,
  tee_used AS legacy_tee,
  tee_marker AS new_tee,
  played_at AS legacy_date,
  completed_at AS new_date
FROM public.rounds
WHERE status = 'completed'
ORDER BY created_at DESC
LIMIT 10;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this to verify all completed rounds have required data:
--
-- SELECT
--   COUNT(*) AS total_completed,
--   COUNT(total_gross) AS has_gross,
--   COUNT(tee_marker) AS has_tee_marker,
--   COUNT(completed_at) AS has_completed_at
-- FROM rounds
-- WHERE status = 'completed';
--
-- Expected: All counts should be equal
-- ============================================================================
