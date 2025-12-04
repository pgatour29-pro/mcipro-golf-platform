-- ============================================================================
-- NUCLEAR OPTION - COMPLETELY OPEN UP DATABASE
-- ============================================================================

-- SCORECARDS
ALTER TABLE scorecards DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON scorecards CASCADE;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON scorecards CASCADE;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON scorecards CASCADE;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON scorecards CASCADE;
DROP POLICY IF EXISTS "scorecards_select" ON scorecards CASCADE;
DROP POLICY IF EXISTS "scorecards_insert" ON scorecards CASCADE;
DROP POLICY IF EXISTS "scorecards_update" ON scorecards CASCADE;
DROP POLICY IF EXISTS "scorecards_delete" ON scorecards CASCADE;
GRANT ALL ON scorecards TO anon, authenticated, service_role;

-- SCORES
ALTER TABLE scores DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON scores CASCADE;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON scores CASCADE;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON scores CASCADE;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON scores CASCADE;
DROP POLICY IF EXISTS "scores_select" ON scores CASCADE;
DROP POLICY IF EXISTS "scores_insert" ON scores CASCADE;
DROP POLICY IF EXISTS "scores_update" ON scores CASCADE;
DROP POLICY IF EXISTS "scores_delete" ON scores CASCADE;
GRANT ALL ON scores TO anon, authenticated, service_role;

-- ROUNDS
ALTER TABLE rounds DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rounds_select_own" ON rounds CASCADE;
DROP POLICY IF EXISTS "rounds_insert_own" ON rounds CASCADE;
DROP POLICY IF EXISTS "rounds_update_own" ON rounds CASCADE;
DROP POLICY IF EXISTS "rounds_delete_own" ON rounds CASCADE;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON rounds CASCADE;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON rounds CASCADE;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON rounds CASCADE;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON rounds CASCADE;
GRANT ALL ON rounds TO anon, authenticated, service_role;

-- SIDE_GAME_POOLS
ALTER TABLE side_game_pools DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON side_game_pools CASCADE;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON side_game_pools CASCADE;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON side_game_pools CASCADE;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON side_game_pools CASCADE;
GRANT ALL ON side_game_pools TO anon, authenticated, service_role;

-- POOL_ENTRANTS
ALTER TABLE pool_entrants DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON pool_entrants CASCADE;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON pool_entrants CASCADE;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON pool_entrants CASCADE;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON pool_entrants CASCADE;
GRANT ALL ON pool_entrants TO anon, authenticated, service_role;

-- Verify
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename IN ('scorecards', 'scores', 'rounds', 'side_game_pools', 'pool_entrants')
ORDER BY tablename;
