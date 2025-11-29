-- ============================================================================
-- ASSIGN ALL EXISTING ROUNDS TO TRGG
-- ============================================================================
-- This migration assigns all existing rounds (with NULL primary_society_id)
-- to the TRGG society, then recalculates all handicaps
-- ============================================================================

BEGIN;

-- Store TRGG UUID
DO $$
DECLARE
  v_trgg_uuid UUID := '7c0e4b72-d925-44bc-afda-38259a7ba346';
  v_rounds_updated INTEGER;
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'ASSIGNING EXISTING ROUNDS TO TRGG';
  RAISE NOTICE '================================================';

  -- Show current state
  RAISE NOTICE '';
  RAISE NOTICE 'BEFORE: Rounds with NULL primary_society_id:';
  SELECT COUNT(*) INTO v_rounds_updated
  FROM public.rounds
  WHERE primary_society_id IS NULL
    AND status = 'completed'
    AND total_gross IS NOT NULL;

  RAISE NOTICE '  - Unassigned rounds: %', v_rounds_updated;

  -- Assign all NULL rounds to TRGG
  RAISE NOTICE '';
  RAISE NOTICE 'Assigning % rounds to TRGG...', v_rounds_updated;

  UPDATE public.rounds
  SET primary_society_id = v_trgg_uuid
  WHERE primary_society_id IS NULL
    AND status = 'completed'
    AND total_gross IS NOT NULL;

  GET DIAGNOSTICS v_rounds_updated = ROW_COUNT;

  RAISE NOTICE '  ✓ Updated % rounds', v_rounds_updated;

  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'RECALCULATING ALL HANDICAPS';
  RAISE NOTICE '================================================';

  -- Recalculate all society handicaps
  PERFORM recalculate_all_society_handicaps();

  RAISE NOTICE '';
  RAISE NOTICE 'Handicap recalculation complete!';
  RAISE NOTICE '================================================';
END $$;

-- Show rounds by society
SELECT
  '=== ROUNDS BY SOCIETY ===' AS status,
  COALESCE(sp.society_name, 'Unassigned') AS society,
  COUNT(*) AS round_count
FROM public.rounds r
LEFT JOIN public.society_profiles sp ON sp.id = r.primary_society_id
WHERE r.status = 'completed'
  AND r.total_gross IS NOT NULL
GROUP BY sp.society_name
ORDER BY society;

-- Show final handicap summary
SELECT
  CASE
    WHEN sh.society_id IS NULL THEN 'Universal'
    ELSE sp.society_name
  END AS handicap_type,
  COUNT(DISTINCT sh.golfer_id) AS golfers_with_handicap,
  ROUND(AVG(sh.handicap_index), 1) AS avg_handicap,
  MIN(sh.handicap_index) AS lowest_handicap,
  MAX(sh.handicap_index) AS highest_handicap
FROM public.society_handicaps sh
LEFT JOIN public.society_profiles sp ON sp.id = sh.society_id
GROUP BY sh.society_id, sp.society_name
ORDER BY sp.society_name NULLS FIRST;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this to verify all completed rounds are assigned:
--
-- SELECT
--   COALESCE(sp.society_name, 'Unassigned') AS society,
--   COUNT(*) AS round_count
-- FROM rounds r
-- LEFT JOIN society_profiles sp ON sp.id = r.primary_society_id
-- WHERE r.status = 'completed' AND r.total_gross IS NOT NULL
-- GROUP BY sp.society_name
-- ORDER BY society;
--
-- Expected: 0 "Unassigned" rounds
-- ============================================================================
