-- FIX: Scorecard trigger calling update_player_handicap with wrong parameter order
-- The function expects: (golfer_id, new_handicap, round_id, all_diffs, rounds_used, best_diffs)
-- But trigger was calling: (golfer_id, new_handicap, rounds_used, all_diffs, best_diffs, scorecard_id)

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

      -- Call the handicap calculation function
      SELECT * INTO v_result
      FROM calculate_handicap_index(v_golfer_id);

      -- Update player handicap with CORRECT parameter order
      IF v_result.new_handicap_index IS NOT NULL THEN
        PERFORM update_player_handicap(
          v_golfer_id,                    -- p_golfer_id TEXT
          v_result.new_handicap_index,    -- p_new_handicap DECIMAL
          NULL,                           -- p_round_id UUID (NULL for scorecards)
          v_result.all_differentials,     -- p_differentials JSONB
          v_result.rounds_used,           -- p_rounds_used INTEGER
          v_result.best_differentials     -- p_best_differentials JSONB
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
