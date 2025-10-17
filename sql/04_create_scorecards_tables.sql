-- =====================================================
-- CREATE SCORECARDS AND SCORES TABLES
-- =====================================================
-- This SQL file creates the missing 'scorecards' and 'scores' tables
-- that are referenced in the code but were never created in the database.
-- This fixes the HTTP 400 errors when trying to save live scorecard data.
--
-- Run this in Supabase SQL Editor to fix the 400 errors.
-- =====================================================

-- =====================================================
-- CREATE SCORECARDS TABLE
-- Stores in-progress and completed scorecard metadata
-- =====================================================
CREATE TABLE IF NOT EXISTS public.scorecards (
  id TEXT PRIMARY KEY,
  event_id TEXT,  -- References society_events(id)
  player_id TEXT NOT NULL,
  player_name TEXT,
  handicap REAL,
  playing_handicap INTEGER,
  group_id TEXT,
  course_id TEXT,
  course_name TEXT,
  tee_marker TEXT,
  scoring_format TEXT DEFAULT 'stableford',
  status TEXT CHECK (status IN ('in_progress', 'completed', 'abandoned')) DEFAULT 'in_progress',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_gross INTEGER,
  total_net INTEGER,
  total_stableford INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scorecards_player ON public.scorecards(player_id);
CREATE INDEX IF NOT EXISTS idx_scorecards_event ON public.scorecards(event_id);
CREATE INDEX IF NOT EXISTS idx_scorecards_status ON public.scorecards(status);
CREATE INDEX IF NOT EXISTS idx_scorecards_group ON public.scorecards(group_id);

-- =====================================================
-- CREATE SCORES TABLE
-- Stores hole-by-hole scores for each scorecard
-- =====================================================
CREATE TABLE IF NOT EXISTS public.scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scorecard_id TEXT NOT NULL,
  hole_number INTEGER NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  par INTEGER NOT NULL,
  stroke_index INTEGER NOT NULL,
  gross_score INTEGER NOT NULL,
  net_score INTEGER,
  handicap_strokes INTEGER DEFAULT 0,
  stableford INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scorecard_id, hole_number)
);

-- Index for scorecard queries
CREATE INDEX IF NOT EXISTS idx_scores_scorecard ON public.scores(scorecard_id);
CREATE INDEX IF NOT EXISTS idx_scores_hole ON public.scores(hole_number);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================
ALTER TABLE public.scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- Public access policies (matching your existing pattern)
-- Note: Consider tightening these policies in production for better security

-- Scorecards policies
CREATE POLICY "Scorecards are viewable by everyone" ON public.scorecards
  FOR SELECT USING (true);

CREATE POLICY "Scorecards are insertable by everyone" ON public.scorecards
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Scorecards are updatable by everyone" ON public.scorecards
  FOR UPDATE USING (true);

CREATE POLICY "Scorecards are deletable by everyone" ON public.scorecards
  FOR DELETE USING (true);

-- Scores policies
CREATE POLICY "Scores are viewable by everyone" ON public.scores
  FOR SELECT USING (true);

CREATE POLICY "Scores are insertable by everyone" ON public.scores
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Scores are updatable by everyone" ON public.scores
  FOR UPDATE USING (true);

CREATE POLICY "Scores are deletable by everyone" ON public.scores
  FOR DELETE USING (true);

-- =====================================================
-- REALTIME SUBSCRIPTION (OPTIONAL)
-- Enable if you want real-time updates for live scoring
-- =====================================================
-- Uncomment these lines if you want realtime updates:
-- ALTER PUBLICATION supabase_realtime ADD TABLE scorecards;
-- ALTER PUBLICATION supabase_realtime ADD TABLE scores;

-- =====================================================
-- VERIFICATION QUERIES
-- Run these after table creation to verify success
-- =====================================================
-- Check tables exist:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name IN ('scorecards', 'scores');

-- Check columns:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'scorecards' ORDER BY ordinal_position;

-- Check policies:
-- SELECT schemaname, tablename, policyname FROM pg_policies
-- WHERE tablename IN ('scorecards', 'scores');

-- =====================================================
-- END OF SQL SCRIPT
-- =====================================================
