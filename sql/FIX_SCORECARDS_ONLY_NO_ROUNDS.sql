-- ============================================================================
-- FIX SCORECARDS ONLY - DO NOT TOUCH ROUNDS TABLE
-- ============================================================================
-- This script ONLY fixes scorecards, scores, and pools
-- It does NOT touch the rounds table AT ALL to avoid handicap corruption

-- SCORECARDS - Disable RLS completely
ALTER TABLE scorecards DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON scorecards CASCADE;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON scorecards CASCADE;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON scorecards CASCADE;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON scorecards CASCADE;
DROP POLICY IF EXISTS "scorecards_select" ON scorecards CASCADE;
DROP POLICY IF EXISTS "scorecards_insert" ON scorecards CASCADE;
DROP POLICY IF EXISTS "scorecards_update" ON scorecards CASCADE;
DROP POLICY IF EXISTS "scorecards_delete" ON scorecards CASCADE;

-- SCORES - Disable RLS completely
ALTER TABLE scores DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON scores CASCADE;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON scores CASCADE;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON scores CASCADE;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON scores CASCADE;
DROP POLICY IF EXISTS "scores_select" ON scores CASCADE;
DROP POLICY IF EXISTS "scores_insert" ON scores CASCADE;
DROP POLICY IF EXISTS "scores_update" ON scores CASCADE;
DROP POLICY IF EXISTS "scores_delete" ON scores CASCADE;

-- SIDE_GAME_POOLS - Disable RLS completely
ALTER TABLE side_game_pools DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON side_game_pools CASCADE;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON side_game_pools CASCADE;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON side_game_pools CASCADE;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON side_game_pools CASCADE;

-- POOL_ENTRANTS - Disable RLS completely
ALTER TABLE pool_entrants DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON pool_entrants CASCADE;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON pool_entrants CASCADE;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON pool_entrants CASCADE;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON pool_entrants CASCADE;

-- Verify (does NOT include rounds table)
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('scorecards', 'scores', 'side_game_pools', 'pool_entrants')
ORDER BY tablename;
