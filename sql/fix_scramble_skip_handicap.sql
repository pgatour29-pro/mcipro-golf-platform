-- ============================================================================
-- FIX: Skip handicap recalculation for SCRAMBLE rounds
-- Scramble scores are team scores, not individual - should NOT affect handicaps
-- Date: 2026-03-20
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION auto_update_society_handicaps_on_round()
RETURNS TRIGGER AS $$
DECLARE
  v_society RECORD;
  v_new_handicap DECIMAL;
  v_rounds_used INTEGER;
  v_all_diffs JSONB;
  v_best_diffs JSONB;
  v_societies_updated INTEGER := 0;
  v_current_rounds_since INTEGER;
  v_is_private_round BOOLEAN;
  v_is_scramble BOOLEAN;
BEGIN
  -- Only process if round is completed with a valid gross score
  IF NEW.status = 'completed' AND NEW.total_gross IS NOT NULL THEN

    -- ========================================================================
    -- SCRAMBLE CHECK: Skip handicap adjustment for scramble rounds
    -- Scramble scores are team scores, not individual performance
    -- ========================================================================
    v_is_scramble := (
      NEW.scoring_formats::text LIKE '%scramble%'
      OR (NEW.game_config IS NOT NULL AND NEW.game_config::text LIKE '%scramble%')
    );

    IF v_is_scramble THEN
      RAISE NOTICE '[Handicap] SCRAMBLE round detected for % — skipping handicap recalculation (team score)', NEW.golfer_id;
      RETURN NEW;
    END IF;

    -- Check if this is a private/non-society round
    v_is_private_round := (NEW.primary_society_id IS NULL) AND NOT EXISTS (
      SELECT 1 FROM public.round_societies rs WHERE rs.round_id = NEW.id
    );

    -- ========================================================================
    -- SOCIETY HANDICAPS: Update on every round (WHS 8/20)
    -- ========================================================================
    FOR v_society IN
      SELECT DISTINCT society_id
      FROM (
        SELECT NEW.primary_society_id AS society_id
        WHERE NEW.primary_society_id IS NOT NULL
        UNION
        SELECT rs.society_id
        FROM public.round_societies rs
        WHERE rs.round_id = NEW.id
      ) AS all_societies
      WHERE society_id IS NOT NULL
    LOOP
      -- Calculate new handicap for this society
      SELECT * INTO v_new_handicap, v_rounds_used, v_all_diffs, v_best_diffs
      FROM calculate_society_handicap_index(NEW.golfer_id, v_society.society_id);

      IF v_new_handicap IS NOT NULL THEN
        PERFORM update_society_handicap(
          NEW.golfer_id,
          v_society.society_id,
          v_new_handicap,
          v_rounds_used,
          v_all_diffs,
          v_best_diffs
        );
        v_societies_updated := v_societies_updated + 1;
      END IF;
    END LOOP;

    -- ========================================================================
    -- UNIVERSAL HANDICAP: Update only every 3 private rounds
    -- ========================================================================

    -- Get current rounds_since_adjustment counter
    SELECT COALESCE(rounds_since_adjustment, 0) INTO v_current_rounds_since
    FROM public.society_handicaps
    WHERE golfer_id = NEW.golfer_id
      AND society_id IS NULL;

    -- If no record exists yet, start at 0
    IF v_current_rounds_since IS NULL THEN
      v_current_rounds_since := 0;
    END IF;

    -- Increment counter for private rounds
    IF v_is_private_round THEN
      v_current_rounds_since := v_current_rounds_since + 1;

      RAISE NOTICE '[Universal] Private round for %: rounds_since_adjustment = %',
        NEW.golfer_id, v_current_rounds_since;
    END IF;

    -- Check if we should recalculate universal handicap
    IF v_current_rounds_since >= 3 OR NOT v_is_private_round THEN

      -- Calculate new universal handicap
      SELECT * INTO v_new_handicap, v_rounds_used, v_all_diffs, v_best_diffs
      FROM calculate_society_handicap_index(NEW.golfer_id, NULL);

      IF v_new_handicap IS NOT NULL THEN
        -- Update handicap and reset counter
        INSERT INTO public.society_handicaps (
          golfer_id,
          society_id,
          handicap_index,
          rounds_count,
          rounds_since_adjustment,
          last_calculated_at,
          calculation_method
        )
        VALUES (
          NEW.golfer_id,
          NULL,
          v_new_handicap,
          v_rounds_used,
          0,
          NOW(),
          'WHS-5'
        )
        ON CONFLICT (golfer_id, society_id)
        DO UPDATE SET
          handicap_index = EXCLUDED.handicap_index,
          rounds_count = EXCLUDED.rounds_count,
          rounds_since_adjustment = 0,
          last_calculated_at = EXCLUDED.last_calculated_at,
          updated_at = NOW();

        v_societies_updated := v_societies_updated + 1;

        RAISE NOTICE '[Universal] Handicap UPDATED for %: % (reset counter to 0)',
          NEW.golfer_id, v_new_handicap;
      END IF;

    ELSE
      -- Just increment the counter, don't recalculate
      INSERT INTO public.society_handicaps (
        golfer_id,
        society_id,
        handicap_index,
        rounds_count,
        rounds_since_adjustment,
        last_calculated_at,
        calculation_method
      )
      VALUES (
        NEW.golfer_id,
        NULL,
        NULL,
        0,
        v_current_rounds_since,
        NULL,
        'WHS-5'
      )
      ON CONFLICT (golfer_id, society_id)
      DO UPDATE SET
        rounds_since_adjustment = v_current_rounds_since,
        updated_at = NOW();

      RAISE NOTICE '[Universal] Counter incremented for %: % rounds (need 3 to adjust)',
        NEW.golfer_id, v_current_rounds_since;
    END IF;

    RAISE NOTICE 'Round completed: Updated handicaps for % societies/universal', v_societies_updated;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Also exclude scramble rounds from the handicap calculation pool
-- so they're never included when calculating best-of-N differentials
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_society_handicap_index(
  p_golfer_id TEXT,
  p_society_id UUID,
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
BEGIN
  -- Get last 5 completed rounds (EXCLUDING scramble rounds)
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
      -- EXCLUDE scramble rounds from handicap calculations
      AND NOT (r.scoring_formats::text LIKE '%scramble%')
      AND NOT (r.game_config IS NOT NULL AND r.game_config::text LIKE '%scramble%')
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
    LIMIT 5
  LOOP
    SELECT * INTO v_course_rating, v_slope_rating
    FROM get_course_rating_for_tee(v_round.course_id, v_round.tee_marker);

    v_differential := calculate_score_differential(
      v_round.total_gross,
      v_course_rating,
      v_slope_rating
    );

    v_differentials := array_append(v_differentials, v_differential);
  END LOOP;

  rounds_used := array_length(v_differentials, 1);

  IF rounds_used IS NULL OR rounds_used < 3 THEN
    new_handicap_index := NULL;
    all_differentials := '[]'::jsonb;
    best_differentials := '[]'::jsonb;
    RETURN;
  END IF;

  -- Sort differentials ascending
  SELECT array_agg(d ORDER BY d ASC) INTO v_differentials
  FROM unnest(v_differentials) AS d;

  all_differentials := to_jsonb(v_differentials);

  -- Best 3 of 5 (or best 8 of 20 for society - handled by LIMIT above)
  v_best_avg := (v_differentials[1] + v_differentials[2] + v_differentials[3]) / 3.0;
  best_differentials := to_jsonb(ARRAY[v_differentials[1], v_differentials[2], v_differentials[3]]);

  new_handicap_index := ROUND(v_best_avg, 1);

  RETURN;
END;
$$ LANGUAGE plpgsql;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'SCRAMBLE HANDICAP EXCLUSION FIX APPLIED';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'CHANGE: Scramble rounds now SKIP handicap recalculation entirely.';
  RAISE NOTICE 'Scramble scores are team scores and should not affect individual handicaps.';
  RAISE NOTICE '';
  RAISE NOTICE 'Detection: checks scoring_formats array and game_config for "scramble"';
  RAISE NOTICE '========================================================================';
END $$;
