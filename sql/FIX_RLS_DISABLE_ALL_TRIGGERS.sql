-- ============================================================================
-- FIX RLS - DISABLE ALL HANDICAP TRIGGERS
-- ============================================================================

-- Step 1: Disable BOTH handicap triggers
ALTER TABLE rounds DISABLE TRIGGER trigger_auto_update_handicap;
ALTER TABLE rounds DISABLE TRIGGER trigger_auto_update_society_handicaps;
ALTER TABLE rounds DISABLE TRIGGER trigger_update_buddy_stats;

-- Step 2: Add missing RLS policies to rounds table
DROP POLICY IF EXISTS "rounds_insert_own" ON rounds;
DROP POLICY IF EXISTS "rounds_update_own" ON rounds;
DROP POLICY IF EXISTS "rounds_delete_own" ON rounds;

CREATE POLICY "rounds_insert_own"
  ON rounds FOR INSERT
  TO authenticated
  WITH CHECK (golfer_id = auth.uid()::text);

CREATE POLICY "rounds_update_own"
  ON rounds FOR UPDATE
  TO authenticated
  USING (golfer_id = auth.uid()::text)
  WITH CHECK (golfer_id = auth.uid()::text);

CREATE POLICY "rounds_delete_own"
  ON rounds FOR DELETE
  TO authenticated
  USING (golfer_id = auth.uid()::text);

-- Step 3: Disable RLS on other tables
ALTER TABLE scorecards DISABLE ROW LEVEL SECURITY;
ALTER TABLE scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE side_game_pools DISABLE ROW LEVEL SECURITY;

-- Step 4: Re-enable ALL triggers
ALTER TABLE rounds ENABLE TRIGGER trigger_auto_update_handicap;
ALTER TABLE rounds ENABLE TRIGGER trigger_auto_update_society_handicaps;
ALTER TABLE rounds ENABLE TRIGGER trigger_update_buddy_stats;

-- Verify triggers are enabled
SELECT
  tgname as trigger_name,
  CASE
    WHEN tgenabled = 'O' THEN 'ENABLED'
    WHEN tgenabled = 'D' THEN 'DISABLED'
    ELSE 'OTHER'
  END as status
FROM pg_trigger
WHERE tgrelid = 'rounds'::regclass
AND tgname LIKE '%trigger_%'
ORDER BY tgname;
