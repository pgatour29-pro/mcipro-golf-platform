-- ============================================================================
-- TEST MULTI-SOCIETY HANDICAP SYSTEM
-- This query will test the system with actual data from your database
-- ============================================================================

-- Step 1: Find a real golfer who has completed rounds
DO $$
DECLARE
  v_test_golfer_id TEXT;
  v_trgg_society_id UUID := '7c0e4b72-d925-44bc-afda-38259a7ba346';
BEGIN
  -- Get a golfer who has completed rounds
  SELECT golfer_id INTO v_test_golfer_id
  FROM public.rounds
  WHERE status = 'completed'
    AND total_gross IS NOT NULL
  LIMIT 1;

  IF v_test_golfer_id IS NULL THEN
    RAISE NOTICE 'No completed rounds found in database';
    RETURN;
  END IF;

  RAISE NOTICE '================================================';
  RAISE NOTICE 'Testing with Golfer ID: %', v_test_golfer_id;
  RAISE NOTICE '================================================';

  -- Test 1: Calculate TRGG society handicap
  RAISE NOTICE '';
  RAISE NOTICE '--- TEST 1: TRGG Society Handicap ---';
  PERFORM * FROM calculate_society_handicap_index(
    v_test_golfer_id,
    v_trgg_society_id
  );

  -- Test 2: Calculate Universal handicap (NULL society)
  RAISE NOTICE '';
  RAISE NOTICE '--- TEST 2: Universal Handicap (all rounds) ---';
  PERFORM * FROM calculate_society_handicap_index(
    v_test_golfer_id,
    NULL
  );

  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Test complete!';
  RAISE NOTICE '================================================';
END $$;

-- ============================================================================
-- VIEW RESULTS: Check what handicaps were calculated
-- ============================================================================

SELECT
  golfer_id,
  CASE
    WHEN society_id IS NULL THEN 'Universal'
    ELSE (SELECT society_name FROM society_profiles WHERE id = sh.society_id)
  END AS handicap_type,
  handicap_index,
  rounds_count,
  last_calculated_at
FROM public.society_handicaps sh
ORDER BY golfer_id, society_id NULLS FIRST;

-- ============================================================================
-- VIEW ROUND ASSIGNMENTS: See which rounds belong to which societies
-- ============================================================================

SELECT
  r.id AS round_id,
  r.golfer_id,
  r.total_gross,
  r.completed_at,
  CASE
    WHEN r.primary_society_id IS NULL THEN 'None'
    ELSE (SELECT society_name FROM society_profiles WHERE id = r.primary_society_id)
  END AS primary_society,
  COALESCE(
    (
      SELECT string_agg(sp.society_name, ', ')
      FROM round_societies rs
      JOIN society_profiles sp ON sp.id = rs.society_id
      WHERE rs.round_id = r.id
    ),
    'None'
  ) AS additional_societies
FROM public.rounds r
WHERE r.status = 'completed'
  AND r.total_gross IS NOT NULL
ORDER BY r.completed_at DESC
LIMIT 10;
