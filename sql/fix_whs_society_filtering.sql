-- ============================================================================
-- FIX: WHS 8-of-20 must filter rounds by society
-- ============================================================================
-- BUG: calculate_whs_handicap_index used ALL rounds regardless of society
--      This meant every society got the same handicap value
-- FIX: Add p_society_id parameter, filter rounds to that society only
-- ============================================================================

BEGIN;

-- Drop old single-arg version
DROP FUNCTION IF EXISTS calculate_whs_handicap_index(TEXT);

-- Create fixed version with society filtering
CREATE OR REPLACE FUNCTION calculate_whs_handicap_index(
  p_golfer_id TEXT,
  p_society_id UUID DEFAULT NULL,
  OUT new_handicap_index DECIMAL,
  OUT rounds_used INTEGER,
  OUT all_differentials JSONB,
  OUT best_differentials JSONB
) AS $$
DECLARE
  v_round RECORD;
  v_differentials DECIMAL[] := ARRAY[]::DECIMAL[];
  v_course_rating DECIMAL;
  v_slope_rating DECIMAL;
  v_differential DECIMAL;
  v_num_rounds INTEGER;
  v_num_to_use INTEGER;
  v_adjustment DECIMAL := 0;
  v_avg DECIMAL;
  v_best_diffs DECIMAL[];
BEGIN
  -- Get last 20 completed rounds, filtered by society if provided
  FOR v_round IN
    SELECT
      r.id,
      r.total_gross,
      r.course_id,
      r.tee_marker,
      r.completed_at
    FROM public.rounds r
    WHERE r.golfer_id = p_golfer_id
      AND r.status = 'completed'
      AND r.total_gross IS NOT NULL
      AND r.tee_marker IS NOT NULL
      -- Exclude scramble rounds
      AND NOT (r.scoring_formats::text LIKE '%scramble%')
      AND NOT (r.game_config IS NOT NULL AND r.game_config::text LIKE '%scramble%')
      -- Filter by society: if p_society_id is provided, only include that society's rounds
      AND (
        p_society_id IS NULL
        OR r.primary_society_id = p_society_id
        OR EXISTS (
          SELECT 1 FROM public.round_societies rs
          WHERE rs.round_id = r.id AND rs.society_id = p_society_id
        )
      )
    ORDER BY r.completed_at DESC
    LIMIT 20
  LOOP
    -- Get course rating and slope for the tee played
    SELECT
      COALESCE(
        (SELECT (t->>'rating')::DECIMAL
         FROM courses c, jsonb_array_elements(c.tees) AS t
         WHERE c.id = v_round.course_id
           AND LOWER(t->>'name') = LOWER(v_round.tee_marker)
         LIMIT 1),
        72.0
      ),
      COALESCE(
        (SELECT (t->>'slope')::DECIMAL
         FROM courses c, jsonb_array_elements(c.tees) AS t
         WHERE c.id = v_round.course_id
           AND LOWER(t->>'name') = LOWER(v_round.tee_marker)
         LIMIT 1),
        113.0
      )
    INTO v_course_rating, v_slope_rating;

    -- Calculate score differential: (Gross - Rating) x 113 / Slope
    v_differential := (v_round.total_gross - v_course_rating) * 113.0 / v_slope_rating;
    v_differentials := array_append(v_differentials, v_differential);
  END LOOP;

  -- Count rounds
  v_num_rounds := array_length(v_differentials, 1);

  IF v_num_rounds IS NULL OR v_num_rounds = 0 THEN
    new_handicap_index := NULL;
    rounds_used := 0;
    all_differentials := '[]'::JSONB;
    best_differentials := '[]'::JSONB;
    RETURN;
  END IF;

  all_differentials := to_jsonb(v_differentials);
  rounds_used := v_num_rounds;

  -- WHS Table: Number of differentials to use based on rounds available
  CASE
    WHEN v_num_rounds >= 20 THEN v_num_to_use := 8; v_adjustment := 0;
    WHEN v_num_rounds = 19 THEN v_num_to_use := 7; v_adjustment := 0;
    WHEN v_num_rounds = 18 THEN v_num_to_use := 7; v_adjustment := 0;
    WHEN v_num_rounds = 17 THEN v_num_to_use := 6; v_adjustment := 0;
    WHEN v_num_rounds = 16 THEN v_num_to_use := 6; v_adjustment := 0;
    WHEN v_num_rounds = 15 THEN v_num_to_use := 5; v_adjustment := 0;
    WHEN v_num_rounds = 14 THEN v_num_to_use := 5; v_adjustment := 0;
    WHEN v_num_rounds = 13 THEN v_num_to_use := 5; v_adjustment := 0;
    WHEN v_num_rounds = 12 THEN v_num_to_use := 4; v_adjustment := 0;
    WHEN v_num_rounds = 11 THEN v_num_to_use := 4; v_adjustment := 0;
    WHEN v_num_rounds = 10 THEN v_num_to_use := 4; v_adjustment := 0;
    WHEN v_num_rounds = 9 THEN v_num_to_use := 3; v_adjustment := 0;
    WHEN v_num_rounds = 8 THEN v_num_to_use := 3; v_adjustment := 0;
    WHEN v_num_rounds = 7 THEN v_num_to_use := 2; v_adjustment := 0;
    WHEN v_num_rounds = 6 THEN v_num_to_use := 2; v_adjustment := -1.0;
    WHEN v_num_rounds = 5 THEN v_num_to_use := 1; v_adjustment := 0;
    WHEN v_num_rounds = 4 THEN v_num_to_use := 1; v_adjustment := -1.0;
    WHEN v_num_rounds = 3 THEN v_num_to_use := 1; v_adjustment := -2.0;
    ELSE v_num_to_use := 1; v_adjustment := -2.0;
  END CASE;

  -- Sort and get best N differentials
  SELECT ARRAY(
    SELECT unnest(v_differentials) AS diff
    ORDER BY diff ASC
    LIMIT v_num_to_use
  ) INTO v_best_diffs;

  best_differentials := to_jsonb(v_best_diffs);

  -- Calculate average of best differentials
  SELECT AVG(d) INTO v_avg
  FROM unnest(v_best_diffs) AS d;

  -- Apply 0.96 multiplier and adjustment
  new_handicap_index := ROUND((v_avg * 0.96) + v_adjustment, 1);

  -- Cap at WHS limits
  IF new_handicap_index < -10.0 THEN
    new_handicap_index := -10.0;
  ELSIF new_handicap_index > 54.0 THEN
    new_handicap_index := 54.0;
  END IF;

END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION calculate_whs_handicap_index(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_whs_handicap_index(TEXT, UUID) TO service_role;

-- Fix update_society_handicap_whs to pass society_id to the calculation
CREATE OR REPLACE FUNCTION update_society_handicap_whs(
  p_golfer_id TEXT,
  p_society_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_new_handicap DECIMAL;
  v_rounds_used INTEGER;
  v_all_diffs JSONB;
  v_best_diffs JSONB;
BEGIN
  -- Calculate WHS handicap FILTERED BY SOCIETY
  SELECT * INTO v_new_handicap, v_rounds_used, v_all_diffs, v_best_diffs
  FROM calculate_whs_handicap_index(p_golfer_id, p_society_id);

  IF v_new_handicap IS NOT NULL THEN
    INSERT INTO public.society_handicaps (
      golfer_id,
      society_id,
      handicap_index,
      rounds_count,
      last_calculated_at,
      calculation_method,
      updated_at
    ) VALUES (
      p_golfer_id,
      p_society_id,
      v_new_handicap,
      v_rounds_used,
      NOW(),
      'WHS-8of20',
      NOW()
    )
    ON CONFLICT (golfer_id, society_id)
    DO UPDATE SET
      handicap_index = EXCLUDED.handicap_index,
      rounds_count = EXCLUDED.rounds_count,
      last_calculated_at = EXCLUDED.last_calculated_at,
      calculation_method = EXCLUDED.calculation_method,
      updated_at = EXCLUDED.updated_at;

    RAISE NOTICE 'Updated society handicap for % in society %: % (from % rounds)',
      p_golfer_id, p_society_id, v_new_handicap, v_rounds_used;
  END IF;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION update_society_handicap_whs(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_society_handicap_whs(TEXT, UUID) TO service_role;

-- ============================================================================
-- RECALCULATE ALL SOCIETY HANDICAPS
-- ============================================================================
-- This will fix every golfer in every society

DO $$
DECLARE
  v_rec RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_rec IN
    SELECT DISTINCT golfer_id, society_id
    FROM public.society_handicaps
    WHERE society_id IS NOT NULL
  LOOP
    PERFORM update_society_handicap_whs(v_rec.golfer_id, v_rec.society_id);
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Recalculated % society handicaps', v_count;
END $$;

COMMIT;
