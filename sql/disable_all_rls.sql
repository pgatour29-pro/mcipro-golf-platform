-- Disable RLS on all tables that are causing 400 errors
-- This allows the application to save rounds, scorecards, and scores

-- Disable RLS on scorecards table
ALTER TABLE scorecards DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON scorecards;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON scorecards;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON scorecards;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON scorecards;

-- Disable RLS on scores table
ALTER TABLE scores DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON scores;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON scores;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON scores;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON scores;

-- Disable RLS on side_game_pools table
ALTER TABLE side_game_pools DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON side_game_pools;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON side_game_pools;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON side_game_pools;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON side_game_pools;

-- Verify RLS is disabled on all tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('scorecards', 'scores', 'side_game_pools', 'rounds')
ORDER BY tablename;
