-- =====================================================================
-- FIX START ROUND FREEZE - ALL TABLES IN ONE FILE
-- =====================================================================
-- This fixes RLS policies on EVERY table that Start Round accesses
-- Run this ONE file and Start Round will work
-- =====================================================================

BEGIN;

-- =====================================================================
-- 1. FIX COURSES TABLE
-- =====================================================================
DROP POLICY IF EXISTS "courses_select_all" ON courses;

CREATE POLICY "courses_select_all"
  ON courses FOR SELECT
  TO anon, authenticated
  USING (true);

-- =====================================================================
-- 2. FIX COURSE_HOLES TABLE
-- =====================================================================
DROP POLICY IF EXISTS "course_holes_select_all" ON course_holes;

CREATE POLICY "course_holes_select_all"
  ON course_holes FOR SELECT
  TO anon, authenticated
  USING (true);

-- =====================================================================
-- 3. FIX SCORECARDS TABLE (CREATE IF MISSING)
-- =====================================================================
CREATE TABLE IF NOT EXISTS scorecards (
    id TEXT PRIMARY KEY,
    event_id TEXT,
    player_id TEXT NOT NULL,
    player_name TEXT,
    handicap DECIMAL,
    playing_handicap INTEGER,
    group_id TEXT,
    course_id TEXT,
    course_name TEXT,
    tee_marker TEXT,
    scoring_format TEXT,
    status TEXT DEFAULT 'in_progress',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    total_score INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE scorecards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scorecards_select_all" ON scorecards;
DROP POLICY IF EXISTS "scorecards_insert_all" ON scorecards;
DROP POLICY IF EXISTS "scorecards_update_all" ON scorecards;
DROP POLICY IF EXISTS "scorecards_delete_all" ON scorecards;

CREATE POLICY "scorecards_select_all"
  ON scorecards FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "scorecards_insert_all"
  ON scorecards FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "scorecards_update_all"
  ON scorecards FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "scorecards_delete_all"
  ON scorecards FOR DELETE
  TO anon, authenticated
  USING (true);

-- =====================================================================
-- 4. FIX SCORECARD_HOLES TABLE (CREATE IF MISSING)
-- =====================================================================
CREATE TABLE IF NOT EXISTS scorecard_holes (
    id TEXT PRIMARY KEY,
    scorecard_id TEXT NOT NULL,
    hole_number INTEGER NOT NULL,
    par INTEGER NOT NULL,
    stroke_index INTEGER,
    yardage INTEGER,
    strokes INTEGER,
    putts INTEGER,
    fairway_hit BOOLEAN,
    green_in_regulation BOOLEAN,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE scorecard_holes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scorecard_holes_select_all" ON scorecard_holes;
DROP POLICY IF EXISTS "scorecard_holes_insert_all" ON scorecard_holes;
DROP POLICY IF EXISTS "scorecard_holes_update_all" ON scorecard_holes;
DROP POLICY IF EXISTS "scorecard_holes_delete_all" ON scorecard_holes;

CREATE POLICY "scorecard_holes_select_all"
  ON scorecard_holes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "scorecard_holes_insert_all"
  ON scorecard_holes FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "scorecard_holes_update_all"
  ON scorecard_holes FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "scorecard_holes_delete_all"
  ON scorecard_holes FOR DELETE
  TO anon, authenticated
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scorecards_player_id ON scorecards(player_id);
CREATE INDEX IF NOT EXISTS idx_scorecards_event_id ON scorecards(event_id);
CREATE INDEX IF NOT EXISTS idx_scorecards_group_id ON scorecards(group_id);
CREATE INDEX IF NOT EXISTS idx_scorecard_holes_scorecard_id ON scorecard_holes(scorecard_id);

COMMIT;

-- =====================================================================
-- SUCCESS MESSAGE
-- =====================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '✅ START ROUND FIXED - ALL TABLES READY';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'TABLES FIXED:';
  RAISE NOTICE '  ✅ courses - SELECT policy added';
  RAISE NOTICE '  ✅ course_holes - SELECT policy added';
  RAISE NOTICE '  ✅ scorecards - ALL CRUD policies added';
  RAISE NOTICE '  ✅ scorecard_holes - ALL CRUD policies added';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 START ROUND SHOULD NOW WORK!';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '  1. Hard refresh browser: Ctrl + Shift + F5';
  RAISE NOTICE '  2. Go to Live Scorecard';
  RAISE NOTICE '  3. Click Start Round';
  RAISE NOTICE '  4. It should work instantly - NO FREEZE';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;
