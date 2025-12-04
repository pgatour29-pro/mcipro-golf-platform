-- ============================================================================
-- FORCE DISABLE RLS WITH ADMIN PRIVILEGES
-- ============================================================================

-- Try to disable RLS with explicit CASCADE to drop policies first
DROP POLICY IF EXISTS "scorecards_select" ON scorecards CASCADE;
DROP POLICY IF EXISTS "scorecards_insert" ON scorecards CASCADE;
DROP POLICY IF EXISTS "scorecards_update" ON scorecards CASCADE;
DROP POLICY IF EXISTS "scorecards_delete" ON scorecards CASCADE;

ALTER TABLE scorecards DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scores_select" ON scores CASCADE;
DROP POLICY IF EXISTS "scores_insert" ON scores CASCADE;
DROP POLICY IF EXISTS "scores_update" ON scores CASCADE;
DROP POLICY IF EXISTS "scores_delete" ON scores CASCADE;

ALTER TABLE scores DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "side_game_pools_select" ON side_game_pools CASCADE;
DROP POLICY IF EXISTS "side_game_pools_insert" ON side_game_pools CASCADE;
DROP POLICY IF EXISTS "side_game_pools_update" ON side_game_pools CASCADE;
DROP POLICY IF EXISTS "side_game_pools_delete" ON side_game_pools CASCADE;

ALTER TABLE side_game_pools DISABLE ROW LEVEL SECURITY;

-- Verify
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename IN ('scorecards', 'scores', 'side_game_pools');
