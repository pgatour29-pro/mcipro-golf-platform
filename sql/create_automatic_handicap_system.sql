-- ============================================================================
-- AUTOMATIC HANDICAP ADJUSTMENT SYSTEM (World Handicap System)
-- ============================================================================
-- Created: 2025-11-12
-- Purpose: Automatically calculate and update player handicaps after each round
-- System: World Handicap System (WHS) adapted for last 5 rounds
-- Formula: Best 3 of last 5 score differentials × 0.96
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- TABLE: handicap_history
-- Purpose: Track all handicap changes over time
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.handicap_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Player identification
  golfer_id TEXT NOT NULL,

  -- Handicap values
  old_handicap DECIMAL(4,1),
  new_handicap DECIMAL(4,1) NOT NULL,
  change DECIMAL(4,1), -- new_handicap - old_handicap

  -- Calculation details
  round_id UUID, -- Round that triggered this change
  differentials JSONB, -- Array of score differentials used in calculation
  rounds_used INTEGER, -- How many rounds were used (max 5)
  best_differentials JSONB, -- Best 3 differentials used

  -- Metadata
  calculated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Foreign key
  FOREIGN KEY (round_id) REFERENCES public.rounds(id) ON DELETE SET NULL
);

-- Index for fast lookup by player
CREATE INDEX IF NOT EXISTS idx_handicap_history_golfer
  ON public.handicap_history(golfer_id, calculated_at DESC);

-- ----------------------------------------------------------------------------
-- FUNCTION: get_course_rating_for_tee
-- Purpose: Get course rating and slope rating for a specific tee
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_course_rating_for_tee(
  p_course_id TEXT,
  p_tee_marker TEXT
)
RETURNS TABLE (
  course_rating DECIMAL,
  slope_rating DECIMAL
) AS $$
BEGIN
  -- Default ratings (if not found in courses table)
  -- We'll use standard par 72 / slope 113 as fallback
  RETURN QUERY
  SELECT
    COALESCE(
      CASE
        WHEN p_tee_marker ILIKE '%black%' OR p_tee_marker ILIKE '%championship%' THEN 73.5
        WHEN p_tee_marker ILIKE '%blue%' OR p_tee_marker ILIKE '%men%' THEN 72.0
        WHEN p_tee_marker ILIKE '%white%' OR p_tee_marker ILIKE '%regular%' THEN 70.5
        WHEN p_tee_marker ILIKE '%yellow%' OR p_tee_marker ILIKE '%senior%' THEN 69.0
        WHEN p_tee_marker ILIKE '%red%' OR p_tee_marker ILIKE '%ladies%' THEN 67.5
        ELSE 72.0
      END, 72.0
    )::DECIMAL AS course_rating,
    COALESCE(
      CASE
        WHEN p_tee_marker ILIKE '%black%' OR p_tee_marker ILIKE '%championship%' THEN 130
        WHEN p_tee_marker ILIKE '%blue%' OR p_tee_marker ILIKE '%men%' THEN 125
        WHEN p_tee_marker ILIKE '%white%' OR p_tee_marker ILIKE '%regular%' THEN 120
        WHEN p_tee_marker ILIKE '%yellow%' OR p_tee_marker ILIKE '%senior%' THEN 115
        WHEN p_tee_marker ILIKE '%red%' OR p_tee_marker ILIKE '%ladies%' THEN 110
        ELSE 113
      END, 113
    )::DECIMAL AS slope_rating;

  -- TODO: In future, read from courses.course_data JSONB field if available
  -- Example: courses.course_data->'tees'->p_tee_marker->>'course_rating'
END;
$$ LANGUAGE plpgsql STABLE;

-- ----------------------------------------------------------------------------
-- FUNCTION: calculate_score_differential
-- Purpose: Calculate score differential for a single round using WHS formula
-- Formula: (Adjusted Gross Score - Course Rating) × (113 / Slope Rating)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_score_differential(
  p_adjusted_gross_score INTEGER,
  p_course_rating DECIMAL,
  p_slope_rating DECIMAL
)
RETURNS DECIMAL AS $$
BEGIN
  -- WHS Score Differential formula
  RETURN ROUND(
    (p_adjusted_gross_score - p_course_rating) * (113.0 / p_slope_rating),
    1
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ----------------------------------------------------------------------------
-- FUNCTION: calculate_handicap_index
-- Purpose: Calculate new handicap index based on last 5 rounds (WHS adapted)
-- Returns: New handicap index or NULL if insufficient rounds
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_handicap_index(
  p_golfer_id TEXT,
  OUT new_handicap_index DECIMAL,
  OUT rounds_used INTEGER,
  OUT all_differentials JSONB,
  OUT best_differentials JSONB
) AS $$
DECLARE
  v_round RECORD;
  v_differentials DECIMAL[] := ARRAY[]::DECIMAL[];
  v_best_3_avg DECIMAL;
  v_course_rating DECIMAL;
  v_slope_rating DECIMAL;
  v_differential DECIMAL;
BEGIN
  -- Get last 5 completed rounds with necessary data
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
    LIMIT 5
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

    -- Add to array
    v_differentials := array_append(v_differentials, v_differential);
  END LOOP;

  -- Check if we have enough rounds
  rounds_used := array_length(v_differentials, 1);

  IF rounds_used IS NULL OR rounds_used = 0 THEN
    -- No rounds found
    new_handicap_index := NULL;
    all_differentials := '[]'::JSONB;
    best_differentials := '[]'::JSONB;
    RETURN;
  END IF;

  -- Convert to JSONB for storage
  all_differentials := to_jsonb(v_differentials);

  -- WHS Calculation Rules (adapted for 5 rounds)
  IF rounds_used >= 5 THEN
    -- Use best 3 of 5 (40% like WHS uses 8/20)
    -- Sort differentials ascending and take first 3
    SELECT AVG(diff)
    INTO v_best_3_avg
    FROM (
      SELECT unnest(v_differentials) AS diff
      ORDER BY diff ASC
      LIMIT 3
    ) AS best_3;

    -- Store best 3 for history
    SELECT jsonb_agg(diff ORDER BY diff ASC)
    INTO best_differentials
    FROM (
      SELECT unnest(v_differentials) AS diff
      ORDER BY diff ASC
      LIMIT 3
    ) AS best_3_arr;

  ELSIF rounds_used = 4 THEN
    -- Use best 2 of 4
    SELECT AVG(diff)
    INTO v_best_3_avg
    FROM (
      SELECT unnest(v_differentials) AS diff
      ORDER BY diff ASC
      LIMIT 2
    ) AS best_2;

    SELECT jsonb_agg(diff ORDER BY diff ASC)
    INTO best_differentials
    FROM (
      SELECT unnest(v_differentials) AS diff
      ORDER BY diff ASC
      LIMIT 2
    ) AS best_2_arr;

  ELSIF rounds_used = 3 THEN
    -- Use best 2 of 3
    SELECT AVG(diff)
    INTO v_best_3_avg
    FROM (
      SELECT unnest(v_differentials) AS diff
      ORDER BY diff ASC
      LIMIT 2
    ) AS best_2;

    SELECT jsonb_agg(diff ORDER BY diff ASC)
    INTO best_differentials
    FROM (
      SELECT unnest(v_differentials) AS diff
      ORDER BY diff ASC
      LIMIT 2
    ) AS best_2_arr;

  ELSIF rounds_used <= 2 THEN
    -- Use best 1 (lowest differential)
    SELECT MIN(diff)
    INTO v_best_3_avg
    FROM unnest(v_differentials) AS diff;

    SELECT jsonb_agg(v_best_3_avg) INTO best_differentials;
  END IF;

  -- Apply WHS 0.96 multiplier
  new_handicap_index := ROUND(v_best_3_avg * 0.96, 1);

  -- Cap handicap at reasonable limits (0 to 54.0)
  IF new_handicap_index < 0 THEN
    new_handicap_index := 0.0;
  ELSIF new_handicap_index > 54.0 THEN
    new_handicap_index := 54.0;
  END IF;

END;
$$ LANGUAGE plpgsql STABLE;

-- ----------------------------------------------------------------------------
-- FUNCTION: update_player_handicap
-- Purpose: Update player's handicap in user_profiles table
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_player_handicap(
  p_golfer_id TEXT,
  p_new_handicap DECIMAL,
  p_round_id UUID,
  p_differentials JSONB,
  p_rounds_used INTEGER,
  p_best_differentials JSONB
)
RETURNS VOID AS $$
DECLARE
  v_old_handicap DECIMAL;
  v_profile_data JSONB;
BEGIN
  -- Get current handicap from user_profiles
  SELECT
    COALESCE(
      (profile_data->'golfInfo'->>'handicap')::DECIMAL,
      NULL
    ),
    profile_data
  INTO v_old_handicap, v_profile_data
  FROM public.user_profiles
  WHERE line_user_id = p_golfer_id;

  -- Update profile_data with new handicap
  v_profile_data := jsonb_set(
    COALESCE(v_profile_data, '{}'::JSONB),
    '{golfInfo, handicap}',
    to_jsonb(p_new_handicap)
  );

  -- Update user_profiles table
  UPDATE public.user_profiles
  SET
    profile_data = v_profile_data,
    updated_at = NOW()
  WHERE line_user_id = p_golfer_id;

  -- Log to handicap_history
  INSERT INTO public.handicap_history (
    golfer_id,
    old_handicap,
    new_handicap,
    change,
    round_id,
    differentials,
    rounds_used,
    best_differentials
  ) VALUES (
    p_golfer_id,
    v_old_handicap,
    p_new_handicap,
    p_new_handicap - COALESCE(v_old_handicap, p_new_handicap),
    p_round_id,
    p_differentials,
    p_rounds_used,
    p_best_differentials
  );

  RAISE NOTICE 'Handicap updated for golfer %: % → % (change: %)',
    p_golfer_id,
    COALESCE(v_old_handicap, 0),
    p_new_handicap,
    p_new_handicap - COALESCE(v_old_handicap, p_new_handicap);
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- TRIGGER FUNCTION: auto_update_handicap_on_round_completion
-- Purpose: Automatically recalculate handicap when a round is completed
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auto_update_handicap_on_round_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_new_handicap DECIMAL;
  v_rounds_used INTEGER;
  v_all_diffs JSONB;
  v_best_diffs JSONB;
BEGIN
  -- Only process if round is completed with a valid gross score
  IF NEW.status = 'completed' AND NEW.total_gross IS NOT NULL THEN

    -- Calculate new handicap index
    SELECT * INTO v_new_handicap, v_rounds_used, v_all_diffs, v_best_diffs
    FROM calculate_handicap_index(NEW.golfer_id);

    -- Only update if we got a valid handicap
    IF v_new_handicap IS NOT NULL THEN
      PERFORM update_player_handicap(
        NEW.golfer_id,
        v_new_handicap,
        NEW.id,
        v_all_diffs,
        v_rounds_used,
        v_best_diffs
      );
    ELSE
      RAISE NOTICE 'Insufficient rounds to calculate handicap for golfer %', NEW.golfer_id;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- TRIGGER: trigger_auto_update_handicap
-- Purpose: Fires after round insert/update to recalculate handicap
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_auto_update_handicap ON public.rounds;

CREATE TRIGGER trigger_auto_update_handicap
  AFTER INSERT OR UPDATE OF status, total_gross
  ON public.rounds
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_handicap_on_round_completion();

-- ----------------------------------------------------------------------------
-- RLS (Row Level Security) for handicap_history
-- ----------------------------------------------------------------------------
ALTER TABLE public.handicap_history ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own handicap history
CREATE POLICY "Users can view their own handicap history"
  ON public.handicap_history
  FOR SELECT
  USING (
    golfer_id = auth.uid()::TEXT OR
    golfer_id IN (
      SELECT line_user_id
      FROM public.user_profiles
      WHERE line_user_id = auth.uid()::TEXT
    )
  );

-- Allow service role to manage all handicap history
CREATE POLICY "Service role can manage all handicap history"
  ON public.handicap_history
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ----------------------------------------------------------------------------
-- UTILITY FUNCTION: recalculate_all_handicaps
-- Purpose: Manually recalculate handicaps for all players (admin use)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION recalculate_all_handicaps()
RETURNS TABLE (
  golfer_id TEXT,
  old_handicap DECIMAL,
  new_handicap DECIMAL,
  rounds_used INTEGER
) AS $$
DECLARE
  v_golfer RECORD;
  v_new_hcp DECIMAL;
  v_rounds_used INTEGER;
  v_all_diffs JSONB;
  v_best_diffs JSONB;
  v_old_hcp DECIMAL;
BEGIN
  -- Get all golfers who have completed rounds
  FOR v_golfer IN
    SELECT DISTINCT r.golfer_id
    FROM public.rounds r
    WHERE r.status = 'completed' AND r.total_gross IS NOT NULL
  LOOP
    -- Get current handicap
    SELECT (profile_data->'golfInfo'->>'handicap')::DECIMAL
    INTO v_old_hcp
    FROM public.user_profiles
    WHERE line_user_id = v_golfer.golfer_id;

    -- Calculate new handicap
    SELECT * INTO v_new_hcp, v_rounds_used, v_all_diffs, v_best_diffs
    FROM calculate_handicap_index(v_golfer.golfer_id);

    -- Update if valid
    IF v_new_hcp IS NOT NULL THEN
      PERFORM update_player_handicap(
        v_golfer.golfer_id,
        v_new_hcp,
        NULL, -- No specific round triggered this
        v_all_diffs,
        v_rounds_used,
        v_best_diffs
      );

      -- Return result
      RETURN QUERY SELECT
        v_golfer.golfer_id,
        v_old_hcp,
        v_new_hcp,
        v_rounds_used;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================================================
-- DEPLOYMENT NOTES
-- ============================================================================
-- This migration creates:
--   1. handicap_history table to track all changes
--   2. Functions to calculate WHS-based handicap index
--   3. Trigger to auto-update handicap after each round
--   4. RLS policies for data security
--   5. Utility function to recalculate all handicaps
--
-- After deployment:
--   - All new completed rounds will automatically update handicaps
--   - Run `SELECT * FROM recalculate_all_handicaps()` to backfill existing players
--   - Query `handicap_history` to see all changes over time
--
-- Formula Used:
--   Score Differential = (Adjusted Gross Score - Course Rating) × (113 / Slope)
--   Handicap Index = Average of best 3 of last 5 differentials × 0.96
--
-- Example:
--   Player shoots: 85, 88, 82, 90, 87 (last 5 rounds)
--   Differentials: 12.5, 15.8, 9.7, 17.2, 14.3
--   Best 3: 9.7, 12.5, 14.3 (average = 12.17)
--   Handicap Index: 12.17 × 0.96 = 11.7
-- ============================================================================
