-- ============================================================================
-- FIX: Round save failing because handicap trigger crashes on NULL conflict
-- Date: Feb 4 2026
-- Symptom: "ROUND SAVE FAILED" alert on every Finish Round attempt
-- Root cause: update_society_handicap() uses ON CONFLICT (golfer_id, society_id)
--             but NULL != NULL in PostgreSQL, so universal handicap (society_id=NULL)
--             always fails the conflict check and tries to INSERT duplicates
-- ============================================================================

-- STEP 1: Create proper unique index that handles NULL society_id
-- Uses COALESCE to convert NULL to 'UNIVERSAL' for uniqueness matching
DO $$
BEGIN
    DROP INDEX IF EXISTS idx_society_handicaps_golfer_society;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'society_handicaps_golfer_society_idx'
    ) THEN
        CREATE UNIQUE INDEX society_handicaps_golfer_society_idx
        ON society_handicaps (golfer_id, COALESCE(society_id::text, 'UNIVERSAL'));
        RAISE NOTICE 'Created unique index society_handicaps_golfer_society_idx';
    ELSE
        RAISE NOTICE 'Index already exists';
    END IF;
END $$;

-- STEP 2: Clean up any duplicate universal handicap rows
-- (caused by the broken ON CONFLICT that never matched NULL)
DELETE FROM society_handicaps a
USING society_handicaps b
WHERE a.golfer_id = b.golfer_id
  AND a.society_id IS NULL
  AND b.society_id IS NULL
  AND a.ctid < b.ctid;

-- STEP 3: Fix the update_society_handicap function
-- Use DELETE-then-INSERT pattern instead of ON CONFLICT (handles NULL correctly)
DROP FUNCTION IF EXISTS update_society_handicap(TEXT, UUID, DECIMAL, INTEGER, JSONB, JSONB);

CREATE OR REPLACE FUNCTION update_society_handicap(
  p_golfer_id TEXT,
  p_society_id UUID,
  p_new_handicap DECIMAL,
  p_rounds_used INTEGER,
  p_all_diffs JSONB,
  p_best_diffs JSONB
)
RETURNS VOID AS $$
DECLARE
  v_society_name TEXT;
BEGIN
  IF p_society_id IS NOT NULL THEN
    SELECT society_name INTO v_society_name
    FROM public.society_profiles
    WHERE id = p_society_id;
  ELSE
    v_society_name := 'Universal';
  END IF;

  -- DELETE existing record first (handles NULL properly)
  IF p_society_id IS NULL THEN
    DELETE FROM public.society_handicaps
    WHERE golfer_id = p_golfer_id AND society_id IS NULL;
  ELSE
    DELETE FROM public.society_handicaps
    WHERE golfer_id = p_golfer_id AND society_id = p_society_id;
  END IF;

  -- INSERT new record
  INSERT INTO public.society_handicaps (
    golfer_id, society_id, handicap_index, rounds_count,
    last_calculated_at, calculation_method
  ) VALUES (
    p_golfer_id, p_society_id, p_new_handicap, p_rounds_used,
    NOW(), 'WHS-5'
  );

  RAISE NOTICE '[%] Handicap updated for golfer %: % (% rounds)',
    v_society_name, p_golfer_id, p_new_handicap, p_rounds_used;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION update_society_handicap(TEXT, UUID, DECIMAL, INTEGER, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_society_handicap(TEXT, UUID, DECIMAL, INTEGER, JSONB, JSONB) TO anon;

-- STEP 4: Make the trigger function error-safe
-- If handicap calculation fails, round should STILL save
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
  -- Only process if round is completed with valid data
  IF NEW.status = 'completed' AND NEW.total_gross IS NOT NULL THEN
    BEGIN
      -- Update handicap for each society this golfer belongs to
      FOR v_society IN
        SELECT DISTINCT society_id
        FROM (
          SELECT NEW.primary_society_id AS society_id
          WHERE NEW.primary_society_id IS NOT NULL
          UNION
          SELECT sm.society_id
          FROM public.society_members sm
          WHERE sm.user_id = NEW.golfer_id
            AND sm.status = 'active'
        ) AS all_societies
        WHERE society_id IS NOT NULL
      LOOP
        BEGIN
          PERFORM update_society_handicap_whs(NEW.golfer_id, v_society.society_id);
          v_societies_updated := v_societies_updated + 1;
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'Failed to update society handicap for % in %: %',
            NEW.golfer_id, v_society.society_id, SQLERRM;
        END;
      END LOOP;

      -- Update universal handicap
      BEGIN
        SELECT * INTO v_new_handicap, v_rounds_used, v_all_diffs, v_best_diffs
        FROM calculate_society_handicap_index(NEW.golfer_id, NULL);

        IF v_new_handicap IS NOT NULL THEN
          PERFORM update_society_handicap(
            NEW.golfer_id, NULL,
            v_new_handicap, v_rounds_used, v_all_diffs, v_best_diffs
          );
          v_societies_updated := v_societies_updated + 1;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to update universal handicap for %: %',
          NEW.golfer_id, SQLERRM;
      END;

      RAISE NOTICE 'Round completed: Updated % handicaps', v_societies_updated;
    EXCEPTION WHEN OTHERS THEN
      -- CRITICAL: Never let handicap errors prevent round from saving
      RAISE WARNING 'Handicap trigger error (round still saved): %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 5: Ensure trigger exists and is enabled
DROP TRIGGER IF EXISTS trigger_auto_update_society_handicaps ON public.rounds;

CREATE TRIGGER trigger_auto_update_society_handicaps
  AFTER INSERT OR UPDATE OF status, total_gross, tee_marker, primary_society_id
  ON public.rounds
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_society_handicaps_on_round();

-- STEP 6: Also ensure the old simple trigger is disabled (avoid duplicate triggers)
DROP TRIGGER IF EXISTS trigger_auto_update_handicap ON public.rounds;

-- STEP 7: Verify
SELECT tgname, tgenabled,
  CASE tgenabled WHEN 'O' THEN 'ENABLED' WHEN 'D' THEN 'DISABLED' ELSE tgenabled END as status
FROM pg_trigger
WHERE tgrelid = 'public.rounds'::regclass
  AND tgname LIKE 'trigger_%';

-- ============================================================================
-- DONE! Now try finishing a round again. It should save successfully.
-- The key fix: trigger now has EXCEPTION WHEN OTHERS handlers so even if
-- handicap calculation fails, the round INSERT still succeeds.
-- ============================================================================
