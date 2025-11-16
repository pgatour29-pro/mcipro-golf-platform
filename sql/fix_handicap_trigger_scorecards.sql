-- ============================================================================
-- FIX: Add Handicap Auto-Update Trigger to Scorecards Table
-- ============================================================================
-- Issue: Handicap trigger only exists on 'rounds' table
-- Problem: Live scorecards save to 'scorecards' table, so trigger never fires
-- Solution: Add same trigger to 'scorecards' table
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FUNCTION: auto_update_handicap_from_scorecard
-- Purpose: Update handicap when scorecard is completed
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auto_update_handicap_from_scorecard()
RETURNS TRIGGER AS $$
DECLARE
  v_result RECORD;
  v_golfer_id TEXT;
  v_total_gross INTEGER;
  v_course_id TEXT;
  v_tee_marker TEXT;
BEGIN
  -- Only process when scorecard is marked as completed
  IF (TG_OP = 'INSERT' AND NEW.status = 'completed') OR
     (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed' OR OLD.total_gross IS DISTINCT FROM NEW.total_gross))
  THEN
    v_golfer_id := NEW.player_id;
    v_total_gross := NEW.total_gross;
    v_course_id := NEW.course_id;
    v_tee_marker := COALESCE(NEW.tee_marker, 'white');

    -- Check if we have required data
    IF v_golfer_id IS NOT NULL AND v_total_gross IS NOT NULL AND v_total_gross > 0 THEN

      -- Log the handicap update attempt
      RAISE NOTICE '[Handicap] Processing scorecard % for golfer % (score: %)', NEW.id, v_golfer_id, v_total_gross;

      -- Call the handicap calculation function
      SELECT * INTO v_result
      FROM calculate_handicap_index(v_golfer_id);

      -- Update player handicap in user_profiles
      IF v_result.new_handicap_index IS NOT NULL THEN
        PERFORM update_player_handicap(
          v_golfer_id,
          v_result.new_handicap_index,
          v_result.rounds_used,
          v_result.all_differentials,
          v_result.best_differentials,
          NEW.id::TEXT -- Use scorecard ID as trigger reference
        );

        RAISE NOTICE '[Handicap] ✅ Updated golfer % handicap to % (was %, used % rounds)',
          v_golfer_id,
          v_result.new_handicap_index,
          (SELECT (profile_data->'golfInfo'->>'handicap')::DECIMAL FROM user_profiles WHERE line_user_id = v_golfer_id),
          v_result.rounds_used;
      END IF;
    ELSE
      RAISE NOTICE '[Handicap] ⚠️ Skipping handicap update - missing data (golfer_id: %, total_gross: %)', v_golfer_id, v_total_gross;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- TRIGGER: Add trigger to scorecards table
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_auto_update_handicap_scorecard ON public.scorecards;

CREATE TRIGGER trigger_auto_update_handicap_scorecard
  AFTER INSERT OR UPDATE OF status, total_gross
  ON public.scorecards
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_handicap_from_scorecard();

-- ----------------------------------------------------------------------------
-- VERIFICATION
-- ----------------------------------------------------------------------------
-- Check that trigger exists
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%handicap%'
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- TESTING INSTRUCTIONS
-- ============================================================================
-- 1. Complete a scorecard via Live Scorecard system
-- 2. Check handicap_history table:
--    SELECT * FROM handicap_history ORDER BY calculated_at DESC LIMIT 5;
-- 3. Check user_profiles for updated handicap:
--    SELECT line_user_id, profile_data->'golfInfo'->>'handicap' as handicap
--    FROM user_profiles
--    WHERE line_user_id = 'YOUR_USER_ID';
-- 4. Check trigger is firing:
--    Look for NOTICE messages in Supabase logs
-- ============================================================================
