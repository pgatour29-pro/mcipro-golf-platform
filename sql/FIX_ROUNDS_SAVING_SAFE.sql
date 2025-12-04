-- ============================================================================
-- FIX ROUNDS SAVING WITHOUT CORRUPTING HANDICAPS
-- ============================================================================
-- This script:
-- 1. Temporarily disables handicap auto-calculation trigger
-- 2. Fixes RLS policies to allow round saves
-- 3. Re-enables trigger
-- ============================================================================

-- Step 1: Disable handicap trigger to prevent recalculation during RLS changes
ALTER TABLE rounds DISABLE TRIGGER trigger_auto_update_handicap;

-- Step 2: Fix RLS on rounds table - ADD insert/update/delete policies
-- Keep existing SELECT policy, add missing ones

-- Drop any conflicting policies first
DROP POLICY IF EXISTS "rounds_insert_own" ON rounds;
DROP POLICY IF EXISTS "rounds_update_own" ON rounds;
DROP POLICY IF EXISTS "rounds_delete_own" ON rounds;

-- Allow authenticated users to insert their own rounds
CREATE POLICY "rounds_insert_own"
  ON rounds FOR INSERT
  TO authenticated
  WITH CHECK (golfer_id = auth.uid()::text);

-- Allow authenticated users to update their own rounds
CREATE POLICY "rounds_update_own"
  ON rounds FOR UPDATE
  TO authenticated
  USING (golfer_id = auth.uid()::text)
  WITH CHECK (golfer_id = auth.uid()::text);

-- Allow authenticated users to delete their own rounds
CREATE POLICY "rounds_delete_own"
  ON rounds FOR DELETE
  TO authenticated
  USING (golfer_id = auth.uid()::text);

-- Step 3: Disable RLS on scorecards, scores, side_game_pools
ALTER TABLE scorecards DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON scorecards;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON scorecards;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON scorecards;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON scorecards;

ALTER TABLE scores DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON scores;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON scores;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON scores;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON scores;

ALTER TABLE side_game_pools DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON side_game_pools;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON side_game_pools;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON side_game_pools;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON side_game_pools;

-- Step 4: Re-enable handicap trigger
ALTER TABLE rounds ENABLE TRIGGER trigger_auto_update_handicap;

-- Step 5: Verify everything
-- Check RLS status
SELECT
  tablename,
  CASE WHEN rowsecurity THEN 'RLS ENABLED' ELSE 'RLS DISABLED' END as status
FROM pg_tables
WHERE tablename IN ('rounds', 'scorecards', 'scores', 'side_game_pools')
ORDER BY tablename;

-- Check trigger status
SELECT
  tgname as trigger_name,
  CASE
    WHEN tgenabled = 'O' THEN 'ENABLED'
    WHEN tgenabled = 'D' THEN 'DISABLED'
    ELSE 'UNKNOWN'
  END as status
FROM pg_trigger
WHERE tgname = 'trigger_auto_update_handicap';

-- Check rounds policies
SELECT
  schemaname,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'rounds'
ORDER BY cmd;
