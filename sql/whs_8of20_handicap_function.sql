-- ============================================================================
-- WHS HANDICAP CALCULATION (Best 8 of 20)
-- ============================================================================
-- Standard World Handicap System calculation for society handicaps
-- Uses best 8 of last 20 rounds (with adjustments for fewer rounds)
-- ============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS calculate_whs_handicap_index(TEXT);

-- ----------------------------------------------------------------------------
-- FUNCTION: calculate_whs_handicap_index
-- Purpose: Calculate WHS handicap using best 8 of last 20 rounds
-- Uses: ALL rounds regardless of society (standard WHS approach)
-- Returns: Handicap index, rounds used, differentials
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_whs_handicap_index(
  p_golfer_id TEXT,
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
  -- Get last 20 completed rounds with valid data (ALL rounds, not society-specific)
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

    -- Calculate score differential: (Gross - Rating) × 113 / Slope
    v_differential := (v_round.total_gross - v_course_rating) * 113.0 / v_slope_rating;

    -- Add to array
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

  -- Store all differentials
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

  -- Cap at WHS limits (-10.0 to 54.0)
  IF new_handicap_index < -10.0 THEN
    new_handicap_index := -10.0;
  ELSIF new_handicap_index > 54.0 THEN
    new_handicap_index := 54.0;
  END IF;

END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION calculate_whs_handicap_index(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_whs_handicap_index(TEXT) TO service_role;

-- ----------------------------------------------------------------------------
-- FUNCTION: update_society_handicap_whs
-- Purpose: Update a golfer's society handicap using WHS 8-of-20 formula
-- ----------------------------------------------------------------------------
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
  -- Calculate WHS handicap (uses ALL rounds)
  SELECT * INTO v_new_handicap, v_rounds_used, v_all_diffs, v_best_diffs
  FROM calculate_whs_handicap_index(p_golfer_id);

  IF v_new_handicap IS NOT NULL THEN
    -- Upsert society handicap
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

    RAISE NOTICE 'Updated society handicap for % in society %: %', p_golfer_id, p_society_id, v_new_handicap;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_society_handicap_whs(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_society_handicap_whs(TEXT, UUID) TO service_role;

-- ----------------------------------------------------------------------------
-- MODIFIED TRIGGER FUNCTION: auto_update_society_handicaps_on_round
-- Purpose: When a round is completed, update society handicaps using WHS 8-of-20
--          and universal handicap using best 3-of-5
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auto_update_society_handicaps_on_round()
RETURNS TRIGGER AS $$
DECLARE
  v_society RECORD;
  v_new_handicap DECIMAL;
  v_rounds_used INTEGER;
  v_all_diffs JSONB;
  v_best_diffs JSONB;
  v_societies_updated INTEGER := 0;
BEGIN
  -- Only process if round is completed with a valid gross score and tee marker
  IF NEW.status = 'completed' AND NEW.total_gross IS NOT NULL AND NEW.tee_marker IS NOT NULL THEN

    -- Update handicap for each society this golfer belongs to using WHS 8-of-20
    FOR v_society IN
      SELECT DISTINCT society_id
      FROM (
        -- Primary society from this round
        SELECT NEW.primary_society_id AS society_id
        WHERE NEW.primary_society_id IS NOT NULL

        UNION

        -- Additional societies via junction table
        SELECT rs.society_id
        FROM public.round_societies rs
        WHERE rs.round_id = NEW.id

        UNION

        -- All societies the golfer is a member of
        SELECT sm.society_id
        FROM public.society_members sm
        WHERE sm.user_id = NEW.golfer_id
          AND sm.status = 'active'
      ) AS all_societies
      WHERE society_id IS NOT NULL
    LOOP
      -- Use WHS 8-of-20 for society handicaps
      PERFORM update_society_handicap_whs(NEW.golfer_id, v_society.society_id);
      v_societies_updated := v_societies_updated + 1;
    END LOOP;

    -- Also update universal handicap using the ORIGINAL best 3-of-5 formula
    SELECT * INTO v_new_handicap, v_rounds_used, v_all_diffs, v_best_diffs
    FROM calculate_society_handicap_index(NEW.golfer_id, NULL);

    IF v_new_handicap IS NOT NULL THEN
      PERFORM update_society_handicap(
        NEW.golfer_id,
        NULL, -- Universal handicap
        v_new_handicap,
        v_rounds_used,
        v_all_diffs,
        v_best_diffs
      );
      v_societies_updated := v_societies_updated + 1;
    END IF;

    RAISE NOTICE 'Round completed: Updated % society/universal handicaps', v_societies_updated;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_auto_update_society_handicaps ON public.rounds;

CREATE TRIGGER trigger_auto_update_society_handicaps
  AFTER INSERT OR UPDATE OF status, total_gross, tee_marker, primary_society_id
  ON public.rounds
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_society_handicaps_on_round();

-- ============================================================================
-- SUMMARY:
-- - Society handicaps: WHS 8-of-20 (best 8 of last 20 rounds, all rounds)
-- - Universal handicap: Best 3-of-5 (simplified formula, all rounds)
-- ============================================================================
