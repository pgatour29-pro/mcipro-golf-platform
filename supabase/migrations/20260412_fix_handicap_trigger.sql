-- ============================================================================
-- FIX: UNIVERSAL HANDICAP - UPDATE EVERY 3 ROUNDS
-- ============================================================================
-- Created: 2026-01-25
-- Purpose: Private/non-society rounds should only adjust handicap every 3 rounds
--
-- PROBLEM:
--   Universal handicaps currently update on EVERY completed round
--   This is too aggressive and doesn't match intended behavior
--
-- SOLUTION:
--   - Add rounds_since_adjustment counter to society_handicaps
--   - For universal handicaps (society_id IS NULL): only recalculate when counter = 3
--   - For society handicaps: continue updating every round (WHS 8/20)
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Add rounds_since_adjustment column
-- ============================================================================

ALTER TABLE public.society_handicaps
ADD COLUMN IF NOT EXISTS rounds_since_adjustment INTEGER DEFAULT 0;

COMMENT ON COLUMN public.society_handicaps.rounds_since_adjustment IS
  'Counter for universal handicaps: only recalculate when this reaches 3. Reset to 0 after adjustment. Not used for society handicaps.';

-- ============================================================================
-- STEP 2: Replace the trigger function with "every 3 rounds" logic
-- ============================================================================

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
BEGIN
  -- Only process if round is completed with a valid gross score
  IF NEW.status = 'completed' AND NEW.total_gross IS NOT NULL THEN

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
    -- Recalculate if:
    --   1. Counter reached 3 (private round threshold), OR
    --   2. This is a society round (always update universal too for consistency)
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
          0, -- Reset counter
          NOW(),
          'WHS-5'
        )
        ON CONFLICT (golfer_id, society_id)
        DO UPDATE SET
          handicap_index = EXCLUDED.handicap_index,
          rounds_count = EXCLUDED.rounds_count,
          rounds_since_adjustment = 0, -- Reset counter
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
        NULL, -- No handicap yet if first record
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
-- STEP 3: Initialize existing universal handicap records with counter = 0
-- ============================================================================

UPDATE public.society_handicaps
SET rounds_since_adjustment = 0
WHERE society_id IS NULL
  AND rounds_since_adjustment IS NULL;

-- ============================================================================
-- COMPLETION
-- ============================================================================

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'UNIVERSAL HANDICAP "EVERY 3 ROUNDS" FIX APPLIED';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'CHANGES:';
  RAISE NOTICE '  1. Added rounds_since_adjustment column to society_handicaps';
  RAISE NOTICE '  2. Modified trigger to only update universal handicap every 3 private rounds';
  RAISE NOTICE '  3. Society handicaps still update on every round (WHS 8/20)';
  RAISE NOTICE '';
  RAISE NOTICE 'BEHAVIOR:';
  RAISE NOTICE '  - Private/non-society rounds: increment counter, adjust at 3';
  RAISE NOTICE '  - Society rounds: update society handicap AND universal immediately';
  RAISE NOTICE '  - Counter resets to 0 after each adjustment';
  RAISE NOTICE '';
  RAISE NOTICE 'TO VERIFY:';
  RAISE NOTICE '  SELECT golfer_id, handicap_index, rounds_since_adjustment';
  RAISE NOTICE '  FROM society_handicaps WHERE society_id IS NULL;';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
END $$;
