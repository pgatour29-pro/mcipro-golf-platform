-- =====================================================
-- FIX SCORECARDS TABLE COLUMN TYPES
-- =====================================================
-- This fixes the UUID vs TEXT mismatch for event_id
-- Error: "invalid input syntax for type uuid"
-- Root cause: event_id was UUID but code sends TEXT
-- =====================================================

-- Option 1: If table is empty, just alter the column type
-- =====================================================
ALTER TABLE public.scorecards
  ALTER COLUMN event_id TYPE TEXT;

-- Also fix any other ID columns that might have same issue
ALTER TABLE public.scorecards
  ALTER COLUMN player_id TYPE TEXT;

ALTER TABLE public.scorecards
  ALTER COLUMN id TYPE TEXT;

-- =====================================================
-- Option 2: If Option 1 fails (table has data with UUIDs)
-- Drop and recreate the table
-- =====================================================
-- Uncomment these lines if Option 1 doesn't work:

/*
DROP TABLE IF EXISTS public.scores CASCADE;
DROP TABLE IF EXISTS public.scorecards CASCADE;

-- Recreate scorecards table with correct types
CREATE TABLE public.scorecards (
  id TEXT PRIMARY KEY,
  event_id TEXT,  -- TEXT not UUID
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

-- Indexes
CREATE INDEX idx_scorecards_player ON public.scorecards(player_id);
CREATE INDEX idx_scorecards_event ON public.scorecards(event_id);
CREATE INDEX idx_scorecards_status ON public.scorecards(status);
CREATE INDEX idx_scorecards_group ON public.scorecards(group_id);

-- Recreate scores table
CREATE TABLE public.scores (
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

-- Index
CREATE INDEX idx_scores_scorecard ON public.scores(scorecard_id);
CREATE INDEX idx_scores_hole ON public.scores(hole_number);

-- RLS Policies
ALTER TABLE public.scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scorecards are viewable by everyone" ON public.scorecards
  FOR SELECT USING (true);
CREATE POLICY "Scorecards are insertable by everyone" ON public.scorecards
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Scorecards are updatable by everyone" ON public.scorecards
  FOR UPDATE USING (true);
CREATE POLICY "Scorecards are deletable by everyone" ON public.scorecards
  FOR DELETE USING (true);

CREATE POLICY "Scores are viewable by everyone" ON public.scores
  FOR SELECT USING (true);
CREATE POLICY "Scores are insertable by everyone" ON public.scores
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Scores are updatable by everyone" ON public.scores
  FOR UPDATE USING (true);
CREATE POLICY "Scores are deletable by everyone" ON public.scores
  FOR DELETE USING (true);
*/

-- =====================================================
-- Verify the fix
-- =====================================================
-- Run this after the ALTER commands to verify:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'scorecards'
  AND column_name IN ('id', 'event_id', 'player_id')
ORDER BY ordinal_position;

-- Should show:
-- id          | text
-- event_id    | text
-- player_id   | text
