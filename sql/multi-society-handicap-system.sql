-- ============================================================================
-- MULTI-SOCIETY HANDICAP SYSTEM
-- ============================================================================
-- Created: 2025-11-29
-- Purpose: Enable independent handicap tracking per golf society
-- Location: Pattaya, Thailand
--
-- PROBLEM:
--   - Golfers belong to multiple societies (TRGG, JOA, etc.)
--   - Each golfer has 2-4 different handicaps (one per society)
--   - Societies want to protect members with independent handicap calculations
--
-- SOLUTION:
--   - Each society maintains its own handicap database
--   - Rounds can belong to one or multiple societies
--   - Each society's handicap is calculated ONLY from their own rounds
--   - Optional universal handicap from all rounds combined
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: NEW TABLES FOR MULTI-SOCIETY HANDICAPS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE: society_handicaps
-- Purpose: Store per-society handicaps for each golfer
-- Key Concept: One golfer can have multiple handicaps (one per society)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.society_handicaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  golfer_id TEXT NOT NULL, -- References user_profiles.line_user_id
  society_id UUID, -- References society_profiles.id, NULL = universal handicap

  -- Handicap data
  handicap_index DECIMAL(4,1),
  rounds_count INTEGER DEFAULT 0,

  -- Calculation metadata
  last_calculated_at TIMESTAMPTZ,
  calculation_method TEXT DEFAULT 'WHS-5', -- World Handicap System (best 3 of last 5)

  -- Audit trail
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(golfer_id, society_id),
  CHECK (handicap_index >= -10.0 AND handicap_index <= 54.0), -- WHS limits (allow plus handicaps)

  -- Foreign keys
  FOREIGN KEY (society_id) REFERENCES public.society_profiles(id) ON DELETE CASCADE
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_society_handicaps_golfer
  ON public.society_handicaps(golfer_id);
CREATE INDEX IF NOT EXISTS idx_society_handicaps_society
  ON public.society_handicaps(society_id);
CREATE INDEX IF NOT EXISTS idx_society_handicaps_golfer_society
  ON public.society_handicaps(golfer_id, society_id);

-- ----------------------------------------------------------------------------
-- TABLE: round_societies
-- Purpose: Junction table linking rounds to societies (many-to-many)
-- Key Concept: A round can count for multiple societies simultaneously
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.round_societies (
  round_id UUID NOT NULL,
  society_id UUID NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  PRIMARY KEY (round_id, society_id),

  -- Foreign keys
  FOREIGN KEY (round_id) REFERENCES public.rounds(id) ON DELETE CASCADE,
  FOREIGN KEY (society_id) REFERENCES public.society_profiles(id) ON DELETE CASCADE
);

-- Index for society queries
CREATE INDEX IF NOT EXISTS idx_round_societies_society
  ON public.round_societies(society_id);

-- ============================================================================
-- SECTION 2: MODIFY EXISTING ROUNDS TABLE
-- ============================================================================

-- Add primary_society_id to rounds table (for default society assignment)
ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS primary_society_id UUID REFERENCES public.society_profiles(id) ON DELETE SET NULL;

-- Add index for primary society queries
CREATE INDEX IF NOT EXISTS idx_rounds_primary_society
  ON public.rounds(primary_society_id) WHERE primary_society_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.rounds.primary_society_id IS
  'Primary society this round belongs to. Round can also belong to additional societies via round_societies junction table.';

-- ============================================================================
-- SECTION 3: SOCIETY-SPECIFIC HANDICAP CALCULATION FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FUNCTION: calculate_society_handicap_index
-- Purpose: Calculate handicap index for a specific golfer in a specific society
-- Uses: Only rounds from that society (WHS best 3 of last 5)
-- Returns: New handicap index, rounds used, and differentials
-- ----------------------------------------------------------------------------
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
BEGIN
  -- Get last 5 completed rounds from this society only
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
        -- If society_id is NULL, include ALL rounds (universal handicap)
        p_society_id IS NULL
        OR
        -- Otherwise, only rounds belonging to this society
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

  -- WHS Calculation Rules (best 3 of 5, or proportional for fewer rounds)
  IF rounds_used >= 5 THEN
    -- Use best 3 of 5
    SELECT AVG(diff)
    INTO v_best_avg
    FROM (
      SELECT unnest(v_differentials) AS diff
      ORDER BY diff ASC
      LIMIT 3
    ) AS best_3;

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
    INTO v_best_avg
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
    INTO v_best_avg
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
    INTO v_best_avg
    FROM unnest(v_differentials) AS diff;

    SELECT jsonb_agg(v_best_avg) INTO best_differentials;
  END IF;

  -- Apply WHS 0.96 multiplier
  new_handicap_index := ROUND(v_best_avg * 0.96, 1);

  -- Cap handicap at WHS limits (-10.0 to 54.0)
  -- Allow plus handicaps (negative values) for scratch golfers
  IF new_handicap_index < -10.0 THEN
    new_handicap_index := -10.0;
  ELSIF new_handicap_index > 54.0 THEN
    new_handicap_index := 54.0;
  END IF;

END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION calculate_society_handicap_index(TEXT, UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- FUNCTION: update_society_handicap
-- Purpose: Update a golfer's handicap for a specific society
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_society_handicap(
  p_golfer_id TEXT,
  p_society_id UUID, -- NULL = universal handicap
  p_new_handicap DECIMAL,
  p_rounds_used INTEGER,
  p_all_diffs JSONB,
  p_best_diffs JSONB
)
RETURNS VOID AS $$
DECLARE
  v_society_name TEXT;
BEGIN
  -- Get society name for logging
  IF p_society_id IS NOT NULL THEN
    SELECT society_name INTO v_society_name
    FROM public.society_profiles
    WHERE id = p_society_id;
  ELSE
    v_society_name := 'Universal';
  END IF;

  -- Upsert society handicap
  INSERT INTO public.society_handicaps (
    golfer_id,
    society_id,
    handicap_index,
    rounds_count,
    last_calculated_at,
    calculation_method
  )
  VALUES (
    p_golfer_id,
    p_society_id,
    p_new_handicap,
    p_rounds_used,
    NOW(),
    'WHS-5'
  )
  ON CONFLICT (golfer_id, society_id)
  DO UPDATE SET
    handicap_index = EXCLUDED.handicap_index,
    rounds_count = EXCLUDED.rounds_count,
    last_calculated_at = EXCLUDED.last_calculated_at,
    updated_at = NOW();

  -- Log to console
  RAISE NOTICE '[%] Handicap updated for golfer %: % (based on % rounds)',
    v_society_name,
    p_golfer_id,
    p_new_handicap,
    p_rounds_used;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_society_handicap(TEXT, UUID, DECIMAL, INTEGER, JSONB, JSONB) TO authenticated;

-- ============================================================================
-- SECTION 4: AUTOMATIC HANDICAP UPDATE TRIGGERS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TRIGGER FUNCTION: auto_update_society_handicaps_on_round
-- Purpose: When a round is completed, update handicaps for ALL societies it belongs to
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
  -- Only process if round is completed with a valid gross score
  IF NEW.status = 'completed' AND NEW.total_gross IS NOT NULL THEN

    -- Update handicap for each society this round belongs to
    FOR v_society IN
      -- Get all societies this round belongs to (via primary_society_id and junction table)
      SELECT DISTINCT society_id
      FROM (
        -- Primary society
        SELECT NEW.primary_society_id AS society_id
        WHERE NEW.primary_society_id IS NOT NULL

        UNION

        -- Additional societies via junction table
        SELECT rs.society_id
        FROM public.round_societies rs
        WHERE rs.round_id = NEW.id
      ) AS all_societies
      WHERE society_id IS NOT NULL
    LOOP
      -- Calculate new handicap for this society
      SELECT * INTO v_new_handicap, v_rounds_used, v_all_diffs, v_best_diffs
      FROM calculate_society_handicap_index(NEW.golfer_id, v_society.society_id);

      -- Update if we got a valid handicap
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

    -- Also update universal handicap (all rounds combined)
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

    RAISE NOTICE 'Round completed: Updated handicaps for % societies/universal', v_societies_updated;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- TRIGGER: trigger_auto_update_society_handicaps
-- Purpose: Fires after round insert/update to recalculate society handicaps
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_auto_update_society_handicaps ON public.rounds;

CREATE TRIGGER trigger_auto_update_society_handicaps
  AFTER INSERT OR UPDATE OF status, total_gross, primary_society_id
  ON public.rounds
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_society_handicaps_on_round();

-- ----------------------------------------------------------------------------
-- TRIGGER FUNCTION: auto_update_handicaps_on_society_change
-- Purpose: When round_societies changes, update affected society handicaps
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auto_update_handicaps_on_society_change()
RETURNS TRIGGER AS $$
DECLARE
  v_golfer_id TEXT;
  v_society_id UUID;
  v_new_handicap DECIMAL;
  v_rounds_used INTEGER;
  v_all_diffs JSONB;
  v_best_diffs JSONB;
BEGIN
  -- Get golfer_id from the round
  IF TG_OP = 'DELETE' THEN
    v_society_id := OLD.society_id;

    SELECT golfer_id INTO v_golfer_id
    FROM public.rounds
    WHERE id = OLD.round_id;
  ELSE
    v_society_id := NEW.society_id;

    SELECT golfer_id INTO v_golfer_id
    FROM public.rounds
    WHERE id = NEW.round_id;
  END IF;

  -- Recalculate handicap for the affected society
  SELECT * INTO v_new_handicap, v_rounds_used, v_all_diffs, v_best_diffs
  FROM calculate_society_handicap_index(v_golfer_id, v_society_id);

  IF v_new_handicap IS NOT NULL THEN
    PERFORM update_society_handicap(
      v_golfer_id,
      v_society_id,
      v_new_handicap,
      v_rounds_used,
      v_all_diffs,
      v_best_diffs
    );
  ELSE
    -- If no rounds left for this society, remove the handicap record
    DELETE FROM public.society_handicaps
    WHERE golfer_id = v_golfer_id
      AND society_id = v_society_id;

    RAISE NOTICE 'Removed handicap for golfer % in society % (no rounds)', v_golfer_id, v_society_id;
  END IF;

  -- Also update universal handicap
  SELECT * INTO v_new_handicap, v_rounds_used, v_all_diffs, v_best_diffs
  FROM calculate_society_handicap_index(v_golfer_id, NULL);

  IF v_new_handicap IS NOT NULL THEN
    PERFORM update_society_handicap(
      v_golfer_id,
      NULL,
      v_new_handicap,
      v_rounds_used,
      v_all_diffs,
      v_best_diffs
    );
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- TRIGGER: trigger_update_handicaps_on_society_change
-- Purpose: Update handicaps when round-society associations change
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_update_handicaps_on_society_change ON public.round_societies;

CREATE TRIGGER trigger_update_handicaps_on_society_change
  AFTER INSERT OR DELETE
  ON public.round_societies
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_handicaps_on_society_change();

-- ============================================================================
-- SECTION 5: UTILITY FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FUNCTION: get_golfer_society_handicap
-- Purpose: Get a golfer's handicap for a specific society (helper function)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_golfer_society_handicap(
  p_golfer_id TEXT,
  p_society_id UUID -- NULL = universal
)
RETURNS DECIMAL AS $$
DECLARE
  v_handicap DECIMAL;
BEGIN
  SELECT handicap_index INTO v_handicap
  FROM public.society_handicaps
  WHERE golfer_id = p_golfer_id
    AND society_id IS NOT DISTINCT FROM p_society_id;

  RETURN v_handicap;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_golfer_society_handicap(TEXT, UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- FUNCTION: assign_round_to_societies
-- Purpose: Helper function to assign a round to multiple societies at once
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION assign_round_to_societies(
  p_round_id UUID,
  p_society_ids UUID[]
)
RETURNS INTEGER AS $$
DECLARE
  v_society_id UUID;
  v_count INTEGER := 0;
BEGIN
  -- Insert into round_societies for each society
  FOREACH v_society_id IN ARRAY p_society_ids
  LOOP
    INSERT INTO public.round_societies (round_id, society_id)
    VALUES (p_round_id, v_society_id)
    ON CONFLICT (round_id, society_id) DO NOTHING;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION assign_round_to_societies(UUID, UUID[]) TO authenticated;

-- ----------------------------------------------------------------------------
-- FUNCTION: recalculate_all_society_handicaps
-- Purpose: Batch recalculate all society handicaps (for migration/admin use)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION recalculate_all_society_handicaps()
RETURNS TABLE (
  golfer_id TEXT,
  society_id UUID,
  society_name TEXT,
  new_handicap DECIMAL,
  rounds_used INTEGER
) AS $$
DECLARE
  v_golfer_society RECORD;
  v_new_hcp DECIMAL;
  v_rounds_used INTEGER;
  v_all_diffs JSONB;
  v_best_diffs JSONB;
BEGIN
  -- Get all unique golfer-society combinations from rounds
  FOR v_golfer_society IN
    SELECT DISTINCT
      r.golfer_id,
      COALESCE(rs.society_id, r.primary_society_id) AS society_id,
      sp.society_name
    FROM public.rounds r
    LEFT JOIN public.round_societies rs ON rs.round_id = r.id
    LEFT JOIN public.society_profiles sp ON sp.id = COALESCE(rs.society_id, r.primary_society_id)
    WHERE r.status = 'completed'
      AND r.total_gross IS NOT NULL
      AND (rs.society_id IS NOT NULL OR r.primary_society_id IS NOT NULL)

    UNION

    -- Also calculate universal handicap for each golfer
    SELECT DISTINCT
      r.golfer_id,
      NULL::uuid AS society_id,
      'Universal' AS society_name
    FROM public.rounds r
    WHERE r.status = 'completed'
      AND r.total_gross IS NOT NULL
  LOOP
    -- Calculate handicap
    SELECT * INTO v_new_hcp, v_rounds_used, v_all_diffs, v_best_diffs
    FROM calculate_society_handicap_index(
      v_golfer_society.golfer_id,
      v_golfer_society.society_id
    );

    -- Update if valid
    IF v_new_hcp IS NOT NULL THEN
      PERFORM update_society_handicap(
        v_golfer_society.golfer_id,
        v_golfer_society.society_id,
        v_new_hcp,
        v_rounds_used,
        v_all_diffs,
        v_best_diffs
      );

      -- Return result
      RETURN QUERY SELECT
        v_golfer_society.golfer_id,
        v_golfer_society.society_id,
        v_golfer_society.society_name,
        v_new_hcp,
        v_rounds_used;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION recalculate_all_society_handicaps() TO authenticated;

-- ============================================================================
-- SECTION 6: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.society_handicaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_societies ENABLE ROW LEVEL SECURITY;

-- society_handicaps policies
DROP POLICY IF EXISTS "society_handicaps_select_all" ON public.society_handicaps;
CREATE POLICY "society_handicaps_select_all"
  ON public.society_handicaps FOR SELECT
  TO authenticated
  USING (true); -- Everyone can view handicaps (public info)

DROP POLICY IF EXISTS "society_handicaps_insert_service" ON public.society_handicaps;
CREATE POLICY "society_handicaps_insert_service"
  ON public.society_handicaps FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'service_role' OR golfer_id = auth.uid()::TEXT);

DROP POLICY IF EXISTS "society_handicaps_update_service" ON public.society_handicaps;
CREATE POLICY "society_handicaps_update_service"
  ON public.society_handicaps FOR UPDATE
  TO authenticated
  USING (auth.role() = 'service_role' OR golfer_id = auth.uid()::TEXT);

-- round_societies policies
DROP POLICY IF EXISTS "round_societies_select_all" ON public.round_societies;
CREATE POLICY "round_societies_select_all"
  ON public.round_societies FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "round_societies_insert_own" ON public.round_societies;
CREATE POLICY "round_societies_insert_own"
  ON public.round_societies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rounds r
      WHERE r.id = round_id
        AND r.golfer_id = auth.uid()::TEXT
    )
  );

DROP POLICY IF EXISTS "round_societies_delete_own" ON public.round_societies;
CREATE POLICY "round_societies_delete_own"
  ON public.round_societies FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rounds r
      WHERE r.id = round_id
        AND r.golfer_id = auth.uid()::TEXT
    )
  );

-- ============================================================================
-- SECTION 7: DATA MIGRATION FROM LEGACY HANDICAP SYSTEM
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Migrate existing handicaps to society_handicaps table
-- Strategy:
--   1. Find golfers with existing handicaps in user_profiles.profile_data
--   2. Determine their primary society from rounds
--   3. Create society_handicap records for each golfer-society combination
--   4. Backfill historical rounds with society assignments
-- ----------------------------------------------------------------------------

-- Step 1: Assign primary_society_id to existing rounds based on society_events
UPDATE public.rounds r
SET primary_society_id = se.society_id
FROM public.society_events se
WHERE r.society_event_id = se.id
  AND r.primary_society_id IS NULL
  AND se.society_id IS NOT NULL;

-- Step 2: For society rounds without event, try to infer from round type
-- (This is a best-guess - you may need to manually correct some)
-- For now, we'll skip this and let admins manually assign if needed

-- Step 3: Recalculate all society handicaps from existing rounds
-- This will create society_handicap records for each golfer-society combination
DO $$
DECLARE
  v_results RECORD;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Migration Step 3: Recalculating all society handicaps...';

  FOR v_results IN
    SELECT * FROM recalculate_all_society_handicaps()
  LOOP
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Migration Step 3 Complete: Created/updated % handicap records', v_count;
END $$;

-- ============================================================================
-- SECTION 8: VIEWS FOR EASY QUERYING
-- ============================================================================

-- ----------------------------------------------------------------------------
-- VIEW: v_golfer_handicaps
-- Purpose: Easy view of all handicaps for all golfers across all societies
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_golfer_handicaps AS
SELECT
  sh.golfer_id,
  up.name AS golfer_name,
  sh.society_id,
  COALESCE(sp.society_name, 'Universal') AS society_name,
  sh.handicap_index,
  sh.rounds_count,
  sh.last_calculated_at,
  sh.calculation_method,
  sh.updated_at
FROM public.society_handicaps sh
LEFT JOIN public.user_profiles up ON up.line_user_id = sh.golfer_id
LEFT JOIN public.society_profiles sp ON sp.id = sh.society_id
ORDER BY golfer_name, society_name;

GRANT SELECT ON v_golfer_handicaps TO authenticated;

-- ----------------------------------------------------------------------------
-- VIEW: v_round_societies_detail
-- Purpose: See which societies each round belongs to
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_round_societies_detail AS
SELECT
  r.id AS round_id,
  r.golfer_id,
  up.name AS golfer_name,
  r.course_name,
  r.total_gross,
  r.completed_at,

  -- Primary society
  r.primary_society_id,
  sp_primary.society_name AS primary_society_name,

  -- All societies (including additional from junction table)
  ARRAY_AGG(DISTINCT sp_all.society_name) FILTER (WHERE sp_all.society_name IS NOT NULL) AS all_societies,
  ARRAY_AGG(DISTINCT rs.society_id) FILTER (WHERE rs.society_id IS NOT NULL) AS all_society_ids

FROM public.rounds r
LEFT JOIN public.user_profiles up ON up.line_user_id = r.golfer_id
LEFT JOIN public.society_profiles sp_primary ON sp_primary.id = r.primary_society_id
LEFT JOIN public.round_societies rs ON rs.round_id = r.id
LEFT JOIN public.society_profiles sp_all ON sp_all.id = rs.society_id OR sp_all.id = r.primary_society_id
WHERE r.status = 'completed'
GROUP BY r.id, up.name, sp_primary.society_name;

GRANT SELECT ON v_round_societies_detail TO authenticated;

COMMIT;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'MULTI-SOCIETY HANDICAP SYSTEM DEPLOYED SUCCESSFULLY';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'NEW TABLES CREATED:';
  RAISE NOTICE '  - society_handicaps (per-society handicap tracking)';
  RAISE NOTICE '  - round_societies (round-to-society junction table)';
  RAISE NOTICE '';
  RAISE NOTICE 'MODIFIED TABLES:';
  RAISE NOTICE '  - rounds (added primary_society_id column)';
  RAISE NOTICE '';
  RAISE NOTICE 'FUNCTIONS CREATED:';
  RAISE NOTICE '  - calculate_society_handicap_index(golfer_id, society_id)';
  RAISE NOTICE '  - update_society_handicap(...)';
  RAISE NOTICE '  - get_golfer_society_handicap(golfer_id, society_id)';
  RAISE NOTICE '  - assign_round_to_societies(round_id, society_ids[])';
  RAISE NOTICE '  - recalculate_all_society_handicaps()';
  RAISE NOTICE '';
  RAISE NOTICE 'TRIGGERS CREATED:';
  RAISE NOTICE '  - trigger_auto_update_society_handicaps (on rounds)';
  RAISE NOTICE '  - trigger_update_handicaps_on_society_change (on round_societies)';
  RAISE NOTICE '';
  RAISE NOTICE 'VIEWS CREATED:';
  RAISE NOTICE '  - v_golfer_handicaps (all handicaps across all societies)';
  RAISE NOTICE '  - v_round_societies_detail (rounds with society assignments)';
  RAISE NOTICE '';
  RAISE NOTICE 'MIGRATION COMPLETED:';
  RAISE NOTICE '  - Existing rounds assigned to societies where possible';
  RAISE NOTICE '  - All society handicaps recalculated';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '  1. Update frontend to show society selector when saving rounds';
  RAISE NOTICE '  2. Display per-society handicaps in golfer profiles';
  RAISE NOTICE '  3. Test multi-society round assignment';
  RAISE NOTICE '  4. Verify handicap calculations per society';
  RAISE NOTICE '';
  RAISE NOTICE 'QUERY EXAMPLES:';
  RAISE NOTICE '  -- View all handicaps:';
  RAISE NOTICE '    SELECT * FROM v_golfer_handicaps;';
  RAISE NOTICE '';
  RAISE NOTICE '  -- Get golfer handicap for specific society:';
  RAISE NOTICE '    SELECT get_golfer_society_handicap(''pgatour29'', society_uuid);';
  RAISE NOTICE '';
  RAISE NOTICE '  -- Assign round to multiple societies:';
  RAISE NOTICE '    SELECT assign_round_to_societies(round_uuid, ARRAY[society1_uuid, society2_uuid]);';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;
