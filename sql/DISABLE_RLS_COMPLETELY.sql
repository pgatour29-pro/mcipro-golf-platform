-- COMPLETELY DISABLE RLS TO MAKE MATCHPLAY WORK
-- Run this in Supabase SQL Editor

-- Disable RLS completely on side_game_pools
ALTER TABLE side_game_pools DISABLE ROW LEVEL SECURITY;

-- Disable RLS completely on scorecards
ALTER TABLE scorecards DISABLE ROW LEVEL SECURITY;

-- Disable RLS completely on scores
ALTER TABLE scores DISABLE ROW LEVEL SECURITY;

-- Verify
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('side_game_pools', 'scorecards', 'scores');
