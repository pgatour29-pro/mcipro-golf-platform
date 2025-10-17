-- ===========================================================================
-- ENHANCE ROUND HISTORY FOR MULTI-FORMAT SCORING
-- ===========================================================================
-- Date: October 17, 2025
-- Purpose: Extend round history to support multiple scoring formats and
--          Scramble format enhancements
-- ===========================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- ADD COLUMNS TO rounds TABLE
-- ---------------------------------------------------------------------------

-- Add multi-format support
ALTER TABLE public.rounds
ADD COLUMN IF NOT EXISTS scoring_formats JSONB DEFAULT '["stableford"]'::jsonb,
ADD COLUMN IF NOT EXISTS format_scores JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS posted_formats TEXT[] DEFAULT ARRAY['stableford'];

-- Add Scramble-specific fields
ALTER TABLE public.rounds
ADD COLUMN IF NOT EXISTS scramble_config JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS team_size INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS drive_requirements JSONB DEFAULT NULL;

-- Add score distribution tracking
ALTER TABLE public.rounds
ADD COLUMN IF NOT EXISTS shared_with TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS posted_to_organizer BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS organizer_id TEXT DEFAULT NULL;

-- Comments for documentation
COMMENT ON COLUMN public.rounds.scoring_formats IS 'Array of scoring formats used: ["stableford", "strokeplay", "scramble", etc.]';
COMMENT ON COLUMN public.rounds.format_scores IS 'JSON object with scores for each format: {"stableford": 36, "strokeplay": 76, "nassau": {"front": 2, "back": -1, "total": 1}}';
COMMENT ON COLUMN public.rounds.posted_formats IS 'Array of formats posted to official handicap (subset of scoring_formats)';
COMMENT ON COLUMN public.rounds.scramble_config IS 'Scramble settings: {"teamSize": 4, "minDrivesPerPlayer": 4, "driveTracking": true}';
COMMENT ON COLUMN public.rounds.team_size IS 'Number of players in team format (2, 3, or 4)';
COMMENT ON COLUMN public.rounds.drive_requirements IS 'Drive requirements: {"player1": {"min": 4, "used": 5}, "player2": {...}}';

-- ---------------------------------------------------------------------------
-- ADD COLUMNS TO round_holes TABLE
-- ---------------------------------------------------------------------------

-- Add Scramble-specific hole tracking
ALTER TABLE public.round_holes
ADD COLUMN IF NOT EXISTS drive_player_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS drive_player_name TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS putt_player_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS putt_player_name TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS team_score INTEGER DEFAULT NULL;

-- Comments
COMMENT ON COLUMN public.round_holes.drive_player_id IS 'For Scramble: LINE user ID of player whose drive was used';
COMMENT ON COLUMN public.round_holes.drive_player_name IS 'For Scramble: Name of player whose drive was used';
COMMENT ON COLUMN public.round_holes.putt_player_id IS 'For Scramble: LINE user ID of player who made the putt';
COMMENT ON COLUMN public.round_holes.putt_player_name IS 'For Scramble: Name of player who made the putt';
COMMENT ON COLUMN public.round_holes.team_score IS 'For team formats: Team score for this hole';

-- ---------------------------------------------------------------------------
-- UPDATE HELPER FUNCTION: Enhanced archive with multi-format support
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.archive_scorecard_to_history(
  p_scorecard_id UUID,
  p_round_type TEXT DEFAULT 'private',
  p_society_event_id UUID DEFAULT NULL,
  p_scoring_formats JSONB DEFAULT '["stableford"]'::jsonb,
  p_format_scores JSONB DEFAULT '{}'::jsonb,
  p_posted_formats TEXT[] DEFAULT ARRAY['stableford'],
  p_scramble_config JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_round_id UUID;
  v_scorecard RECORD;
  v_organizer_id TEXT;
BEGIN
  -- Fetch scorecard data
  SELECT * INTO v_scorecard
  FROM scorecards
  WHERE id = p_scorecard_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Scorecard not found';
  END IF;

  -- Get organizer ID if society event
  IF p_society_event_id IS NOT NULL THEN
    SELECT organizer_id INTO v_organizer_id
    FROM society_events
    WHERE id = p_society_event_id;
  END IF;

  -- Create round record with multi-format support
  INSERT INTO rounds (
    golfer_id,
    course_id,
    course_name,
    type,
    society_event_id,
    started_at,
    completed_at,
    status,
    total_gross,
    total_net,
    total_stableford,
    handicap_used,
    tee_marker,
    scoring_formats,
    format_scores,
    posted_formats,
    scramble_config,
    posted_to_organizer,
    organizer_id
  )
  VALUES (
    v_scorecard.player_id,
    v_scorecard.course_id,
    v_scorecard.course_name,
    p_round_type,
    p_society_event_id,
    v_scorecard.started_at,
    NOW(),
    'completed',
    v_scorecard.total_gross,
    v_scorecard.total_net,
    v_scorecard.total_stableford,
    v_scorecard.handicap,
    v_scorecard.tee_marker,
    p_scoring_formats,
    p_format_scores,
    p_posted_formats,
    p_scramble_config,
    CASE WHEN p_society_event_id IS NOT NULL THEN true ELSE false END,
    v_organizer_id
  )
  RETURNING id INTO v_round_id;

  -- Copy hole-by-hole scores
  INSERT INTO round_holes (
    round_id,
    hole_number,
    par,
    stroke_index,
    gross_score,
    net_score,
    stableford_points
  )
  SELECT
    v_round_id,
    hole_number,
    par,
    stroke_index,
    gross_score,
    net_score,
    stableford
  FROM scores
  WHERE scorecard_id = p_scorecard_id
  ORDER BY hole_number;

  RETURN v_round_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_scorecard_to_history(UUID, TEXT, UUID, JSONB, JSONB, TEXT[], JSONB) TO authenticated;

-- ---------------------------------------------------------------------------
-- NEW FUNCTION: Distribute round to multiple players
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.distribute_round_to_players(
  p_round_id UUID,
  p_player_ids TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update shared_with array
  UPDATE rounds
  SET shared_with = p_player_ids
  WHERE id = p_round_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.distribute_round_to_players(UUID, TEXT[]) TO authenticated;

-- ---------------------------------------------------------------------------
-- NEW FUNCTION: Get rounds shared with me
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_shared_rounds(
  p_user_id TEXT
)
RETURNS TABLE (
  round_id UUID,
  golfer_id TEXT,
  course_name TEXT,
  completed_at TIMESTAMPTZ,
  total_gross INTEGER,
  scoring_formats JSONB,
  format_scores JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id as round_id,
    golfer_id,
    course_name,
    completed_at,
    total_gross,
    scoring_formats,
    format_scores
  FROM rounds
  WHERE p_user_id = ANY(shared_with)
  ORDER BY completed_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_rounds(TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- UPDATE RLS POLICIES TO INCLUDE SHARED ROUNDS
-- ---------------------------------------------------------------------------

-- Drop existing policy
DROP POLICY IF EXISTS "rounds_select_own" ON public.rounds;

-- Recreate with shared access
CREATE POLICY "rounds_select_own_or_shared"
  ON public.rounds FOR SELECT
  TO authenticated
  USING (
    golfer_id = auth.uid()::text OR
    auth.uid()::text = ANY(shared_with) OR
    auth.uid()::text = organizer_id
  );

-- ---------------------------------------------------------------------------
-- INDEXES FOR PERFORMANCE
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_rounds_shared_with
  ON public.rounds USING GIN(shared_with);

CREATE INDEX IF NOT EXISTS idx_rounds_organizer
  ON public.rounds(organizer_id)
  WHERE organizer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rounds_scoring_formats
  ON public.rounds USING GIN(scoring_formats);

-- ---------------------------------------------------------------------------
-- VERIFICATION QUERIES
-- ---------------------------------------------------------------------------

-- Check new columns
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'rounds'
  AND column_name IN (
    'scoring_formats',
    'format_scores',
    'posted_formats',
    'scramble_config',
    'team_size',
    'drive_requirements',
    'shared_with',
    'posted_to_organizer',
    'organizer_id'
  )
ORDER BY ordinal_position;

-- Check round_holes columns
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'round_holes'
  AND column_name IN (
    'drive_player_id',
    'drive_player_name',
    'putt_player_id',
    'putt_player_name',
    'team_score'
  )
ORDER BY ordinal_position;

COMMIT;

-- ===========================================================================
-- COMPLETION MESSAGE
-- ===========================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'ROUND HISTORY ENHANCED FOR MULTI-FORMAT SCORING';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'NEW COLUMNS IN rounds TABLE:';
  RAISE NOTICE '  - scoring_formats (JSONB array)';
  RAISE NOTICE '  - format_scores (JSONB object)';
  RAISE NOTICE '  - posted_formats (TEXT array)';
  RAISE NOTICE '  - scramble_config (JSONB)';
  RAISE NOTICE '  - team_size (INTEGER)';
  RAISE NOTICE '  - drive_requirements (JSONB)';
  RAISE NOTICE '  - shared_with (TEXT array)';
  RAISE NOTICE '  - posted_to_organizer (BOOLEAN)';
  RAISE NOTICE '  - organizer_id (TEXT)';
  RAISE NOTICE '';
  RAISE NOTICE 'NEW COLUMNS IN round_holes TABLE:';
  RAISE NOTICE '  - drive_player_id, drive_player_name';
  RAISE NOTICE '  - putt_player_id, putt_player_name';
  RAISE NOTICE '  - team_score';
  RAISE NOTICE '';
  RAISE NOTICE 'NEW FUNCTIONS:';
  RAISE NOTICE '  - archive_scorecard_to_history() [ENHANCED]';
  RAISE NOTICE '  - distribute_round_to_players()';
  RAISE NOTICE '  - get_shared_rounds()';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '  1. Update Live Scorecard to use new multi-format saving';
  RAISE NOTICE '  2. Add Scramble configuration UI';
  RAISE NOTICE '  3. Add selective posting checkboxes';
  RAISE NOTICE '  4. Test score distribution';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;
