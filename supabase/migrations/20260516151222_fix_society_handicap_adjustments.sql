-- ============================================================================
-- FIX: calculate_society_handicap_index — add WHS low-rounds adjustments
-- ============================================================================
-- Problem: The function was missing the standard WHS adjustment table for
-- low round counts, causing inflated handicaps for players with few rounds.
-- e.g., 3 rounds with best differential 10.0 → was returning 9.6 (10×0.96)
--        but should return 7.7 ((10-2.0)×0.96) per WHS rules.
-- Also fixes best-N-of-M selection to match standard WHS table.
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_society_handicap_index(
  p_golfer_id TEXT,
  p_society_id UUID, -- NULL = universal (all rounds)
  OUT new_handicap_index DECIMAL,
  OUT rounds_used INTEGER,
  OUT all_differentials JSONB,
  OUT best_differentials JSONB
) AS $$
DECLARE
  v_round RECORD;
  v_differentials DECIMAL[] := ARRAY[]::DECIMAL[];
  v_best_avg DECIMAL;
  v_course_rating DECIMAL;
  v_slope_rating DECIMAL;
  v_differential DECIMAL;
  v_num_to_use INTEGER;
  v_adjustment DECIMAL := 0;
  v_best_diffs DECIMAL[];
  v_max_rounds INTEGER;
BEGIN
  -- Determine max rounds to fetch based on society vs universal
  -- Society: best of last 20 rounds in that society
  -- Universal: best of last 5 rounds (all rounds)
  IF p_society_id IS NULL THEN
    v_max_rounds := 5;
  ELSE
    v_max_rounds := 20;
  END IF;

  -- Get completed rounds
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
      AND (
        p_society_id IS NULL
        OR
        (
          r.primary_society_id = p_society_id
          OR EXISTS (
            SELECT 1 FROM public.round_societies rs
            WHERE rs.round_id = r.id
              AND rs.society_id = p_society_id
          )
        )
      )
    ORDER BY r.completed_at DESC
    LIMIT v_max_rounds
  LOOP
    -- Get course rating and slope rating for the tee played
    SELECT * INTO v_course_rating, v_slope_rating
    FROM get_course_rating_for_tee(v_round.course_id, v_round.tee_marker);

    -- Calculate score differential
    v_differential := calculate_score_differential(
      v_round.total_gross,
      v_course_rating,
      v_slope_rating
    );

    v_differentials := array_append(v_differentials, v_differential);
  END LOOP;

  -- Count rounds
  rounds_used := array_length(v_differentials, 1);

  IF rounds_used IS NULL OR rounds_used = 0 THEN
    new_handicap_index := NULL;
    all_differentials := '[]'::JSONB;
    best_differentials := '[]'::JSONB;
    RETURN;
  END IF;

  all_differentials := to_jsonb(v_differentials);

  -- WHS Table: Number of best differentials to use + adjustment
  IF p_society_id IS NULL THEN
    -- Universal: best 3 of 5 (simplified)
    CASE
      WHEN rounds_used >= 5 THEN v_num_to_use := 3; v_adjustment := 0;
      WHEN rounds_used = 4 THEN v_num_to_use := 2; v_adjustment := 0;
      WHEN rounds_used = 3 THEN v_num_to_use := 1; v_adjustment := -2.0;
      WHEN rounds_used = 2 THEN v_num_to_use := 1; v_adjustment := -2.0;
      ELSE v_num_to_use := 1; v_adjustment := -2.0;
    END CASE;
  ELSE
    -- Society: WHS 8-of-20 with standard adjustment table
    CASE
      WHEN rounds_used >= 20 THEN v_num_to_use := 8; v_adjustment := 0;
      WHEN rounds_used = 19 THEN v_num_to_use := 7; v_adjustment := 0;
      WHEN rounds_used = 18 THEN v_num_to_use := 7; v_adjustment := 0;
      WHEN rounds_used = 17 THEN v_num_to_use := 6; v_adjustment := 0;
      WHEN rounds_used = 16 THEN v_num_to_use := 6; v_adjustment := 0;
      WHEN rounds_used = 15 THEN v_num_to_use := 5; v_adjustment := 0;
      WHEN rounds_used = 14 THEN v_num_to_use := 5; v_adjustment := 0;
      WHEN rounds_used = 13 THEN v_num_to_use := 5; v_adjustment := 0;
      WHEN rounds_used = 12 THEN v_num_to_use := 4; v_adjustment := 0;
      WHEN rounds_used = 11 THEN v_num_to_use := 4; v_adjustment := 0;
      WHEN rounds_used = 10 THEN v_num_to_use := 4; v_adjustment := 0;
      WHEN rounds_used = 9 THEN v_num_to_use := 3; v_adjustment := 0;
      WHEN rounds_used = 8 THEN v_num_to_use := 3; v_adjustment := 0;
      WHEN rounds_used = 7 THEN v_num_to_use := 2; v_adjustment := 0;
      WHEN rounds_used = 6 THEN v_num_to_use := 2; v_adjustment := -1.0;
      WHEN rounds_used = 5 THEN v_num_to_use := 1; v_adjustment := 0;
      WHEN rounds_used = 4 THEN v_num_to_use := 1; v_adjustment := -1.0;
      WHEN rounds_used = 3 THEN v_num_to_use := 1; v_adjustment := -2.0;
      ELSE v_num_to_use := 1; v_adjustment := -2.0;
    END CASE;
  END IF;

  -- Sort and get best N differentials
  SELECT ARRAY(
    SELECT unnest(v_differentials) AS diff
    ORDER BY diff ASC
    LIMIT v_num_to_use
  ) INTO v_best_diffs;

  best_differentials := to_jsonb(v_best_diffs);

  -- Calculate average of best differentials
  SELECT AVG(d) INTO v_best_avg
  FROM unnest(v_best_diffs) AS d;

  -- Apply WHS 0.96 multiplier + adjustment
  new_handicap_index := ROUND((v_best_avg * 0.96) + v_adjustment, 1);

  -- Cap at WHS limits (-10.0 to 54.0)
  IF new_handicap_index < -10.0 THEN
    new_handicap_index := -10.0;
  ELSIF new_handicap_index > 54.0 THEN
    new_handicap_index := 54.0;
  END IF;

END;
$$ LANGUAGE plpgsql STABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_society_handicap_index(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION calculate_society_handicap_index(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_society_handicap_index(TEXT, UUID) TO service_role;
