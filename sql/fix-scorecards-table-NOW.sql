-- =====================================================================
-- FIX SCORECARDS TABLE - GET START ROUND WORKING NOW
-- =====================================================================
-- Creates scorecards table if missing
-- Fixes all RLS policies to allow anon access
-- =====================================================================

BEGIN;

-- Create scorecards table if it doesn't exist
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

-- Enable RLS
ALTER TABLE scorecards ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "scorecards_select_all" ON scorecards;
DROP POLICY IF EXISTS "scorecards_insert_all" ON scorecards;
DROP POLICY IF EXISTS "scorecards_update_all" ON scorecards;
DROP POLICY IF EXISTS "scorecards_delete_all" ON scorecards;

-- Create permissive policies for anon role (app handles filtering)
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

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_scorecards_player_id ON scorecards(player_id);
CREATE INDEX IF NOT EXISTS idx_scorecards_event_id ON scorecards(event_id);
CREATE INDEX IF NOT EXISTS idx_scorecards_group_id ON scorecards(group_id);

COMMIT;

-- =====================================================================
-- SUCCESS MESSAGE
-- =====================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'SCORECARDS TABLE FIXED - START ROUND READY';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'TABLE STATUS:';
  RAISE NOTICE '  - scorecards table created/verified';
  RAISE NOTICE '  - RLS enabled with permissive policies';
  RAISE NOTICE '  - All CRUD operations allowed for anon role';
  RAISE NOTICE '  - Indexes created for performance';
  RAISE NOTICE '';
  RAISE NOTICE 'START ROUND SHOULD NOW WORK!';
  RAISE NOTICE '  1. Add players';
  RAISE NOTICE '  2. Select course';
  RAISE NOTICE '  3. Select tee marker';
  RAISE NOTICE '  4. Click Start Round';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;
