-- ===========================================================================
-- ROUND HISTORY & ARCHIVING SYSTEM
-- ===========================================================================
-- Date: October 15, 2025
-- Purpose: Implement round history archiving for Live Scorecard
-- Features:
--   - Archive completed rounds with full hole-by-hole data
--   - Support for private, society, and tournament rounds
--   - Statistics tracking (putts, fairways, GIR)
--   - Round detail history view
-- ===========================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- TABLE: rounds (Master table for completed rounds)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  golfer_id TEXT NOT NULL,  -- References LINE user ID
  course_id TEXT NOT NULL,  -- References courses.id
  course_name TEXT,

  -- Round type and associations
  type TEXT CHECK (type IN ('private', 'society', 'tournament')) NOT NULL,
  society_event_id UUID,  -- References society_events(id)
  tournament_id UUID,

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Status
  status TEXT CHECK (status IN ('in_progress', 'completed', 'abandoned')) DEFAULT 'completed',

  -- Scoring
  total_gross INTEGER,
  total_net INTEGER,
  total_stableford INTEGER,
  handicap_used DECIMAL(4,1),
  tee_marker TEXT,  -- white, blue, black, red

  -- Additional stats
  total_putts INTEGER,
  fairways_hit INTEGER,
  greens_in_regulation INTEGER,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- TABLE: round_holes (Hole-by-hole details)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.round_holes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL CHECK (hole_number BETWEEN 1 AND 18),

  -- Hole details
  par INTEGER NOT NULL,
  stroke_index INTEGER NOT NULL,

  -- Scores
  gross_score INTEGER NOT NULL,
  net_score INTEGER,
  stableford_points INTEGER,

  -- Additional stats
  putts INTEGER,
  fairway_hit BOOLEAN,
  gir BOOLEAN,  -- Green in regulation

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(round_id, hole_number)
);

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_rounds_golfer_completed
  ON public.rounds(golfer_id, completed_at DESC)
  WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_rounds_type
  ON public.rounds(type);

CREATE INDEX IF NOT EXISTS idx_rounds_society_event
  ON public.rounds(society_event_id)
  WHERE society_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_round_holes_round
  ON public.round_holes(round_id, hole_number);

-- ---------------------------------------------------------------------------
-- RLS (Row Level Security)
-- ---------------------------------------------------------------------------
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_holes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "rounds_select_own" ON public.rounds;
DROP POLICY IF EXISTS "rounds_insert_own" ON public.rounds;
DROP POLICY IF EXISTS "rounds_update_own" ON public.rounds;
DROP POLICY IF EXISTS "round_holes_select_own" ON public.round_holes;
DROP POLICY IF EXISTS "round_holes_insert_own" ON public.round_holes;

-- Users can view their own rounds
CREATE POLICY "rounds_select_own"
  ON public.rounds FOR SELECT
  TO authenticated
  USING (golfer_id = auth.uid()::text);

-- Users can create their own rounds
CREATE POLICY "rounds_insert_own"
  ON public.rounds FOR INSERT
  TO authenticated
  WITH CHECK (golfer_id = auth.uid()::text);

-- Users can update their own rounds
CREATE POLICY "rounds_update_own"
  ON public.rounds FOR UPDATE
  TO authenticated
  USING (golfer_id = auth.uid()::text);

-- Users can view holes from their own rounds
CREATE POLICY "round_holes_select_own"
  ON public.round_holes FOR SELECT
  TO authenticated
  USING (
    round_id IN (
      SELECT id FROM public.rounds
      WHERE golfer_id = auth.uid()::text
    )
  );

-- Users can insert holes for their own rounds
CREATE POLICY "round_holes_insert_own"
  ON public.round_holes FOR INSERT
  TO authenticated
  WITH CHECK (
    round_id IN (
      SELECT id FROM public.rounds
      WHERE golfer_id = auth.uid()::text
    )
  );

-- ---------------------------------------------------------------------------
-- HELPER FUNCTION: Archive scorecard to round history
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.archive_scorecard_to_history(
  p_scorecard_id UUID,
  p_round_type TEXT DEFAULT 'private',
  p_society_event_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_round_id UUID;
  v_scorecard RECORD;
  v_scores RECORD;
BEGIN
  -- Fetch scorecard data
  SELECT * INTO v_scorecard
  FROM scorecards
  WHERE id = p_scorecard_id
    AND player_id = auth.uid()::text;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Scorecard not found or access denied';
  END IF;

  -- Create round record
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
    tee_marker
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
    v_scorecard.tee_marker
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

  -- Update scorecard status
  UPDATE scorecards
  SET status = 'archived'
  WHERE id = p_scorecard_id;

  RETURN v_round_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_scorecard_to_history(UUID, TEXT, UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- VERIFICATION QUERIES
-- ---------------------------------------------------------------------------

-- Check tables exist
SELECT
  'Tables Check' as verification_type,
  tablename,
  'EXISTS' as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('rounds', 'round_holes')
ORDER BY tablename;

-- Check RLS enabled
SELECT
  'RLS Check' as verification_type,
  tablename,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('rounds', 'round_holes')
ORDER BY tablename;

-- Check policies
SELECT
  'Policies Check' as verification_type,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('rounds', 'round_holes')
GROUP BY tablename
ORDER BY tablename;

COMMIT;

-- ===========================================================================
-- COMPLETION MESSAGE
-- ===========================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'ROUND HISTORY SYSTEM CREATED';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'TABLES CREATED:';
  RAISE NOTICE '  - rounds (master round records)';
  RAISE NOTICE '  - round_holes (hole-by-hole details)';
  RAISE NOTICE '';
  RAISE NOTICE 'FUNCTION CREATED:';
  RAISE NOTICE '  - archive_scorecard_to_history(scorecard_id, round_type, event_id)';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '  1. Implement UI for round history list';
  RAISE NOTICE '  2. Add "Finish Round" button to Live Scorecard';
  RAISE NOTICE '  3. Test archiving a completed scorecard';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;
