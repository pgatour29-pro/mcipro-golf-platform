-- =====================================================
-- DISABLE RLS ON ALL GAME-RELATED TABLES
-- Run this in Supabase SQL Editor
-- Updated: 2025-12-07
-- =====================================================

-- This fixes:
-- 1. Public games - golfers can't join (pool_entrants 401 error)
-- 2. Public game leaderboard not visible
-- 3. Society events leaderboard not visible
-- 4. 1v1 matchplay teams not displaying

-- =====================================================
-- DISABLE RLS ON ALL REQUIRED TABLES
-- =====================================================

-- Side game pools (where public games are stored)
ALTER TABLE side_game_pools DISABLE ROW LEVEL SECURITY;

-- Pool entrants (who has joined which games) - THIS WAS MISSING!
ALTER TABLE pool_entrants DISABLE ROW LEVEL SECURITY;

-- Live progress tracking
ALTER TABLE IF EXISTS live_progress DISABLE ROW LEVEL SECURITY;

-- Scorecards
ALTER TABLE scorecards DISABLE ROW LEVEL SECURITY;

-- Individual hole scores
ALTER TABLE scores DISABLE ROW LEVEL SECURITY;

-- Rounds (society event rounds - used for organizer leaderboard)
ALTER TABLE rounds DISABLE ROW LEVEL SECURITY;

-- Season points (used for society standings)
ALTER TABLE IF EXISTS season_points DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- VERIFY ALL TABLES HAVE RLS DISABLED
-- =====================================================
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'side_game_pools',
    'pool_entrants',
    'live_progress',
    'scorecards',
    'scores',
    'rounds',
    'season_points'
  )
ORDER BY tablename;

-- Expected output: ALL should show rls_enabled = false (f)
-- If any show 't' (true), re-run the ALTER TABLE command for that table
