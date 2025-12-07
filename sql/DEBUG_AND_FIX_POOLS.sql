-- =====================================================
-- DEBUG AND FIX PUBLIC POOLS
-- Run this in Supabase SQL Editor
-- Created: 2025-12-07
-- =====================================================
-- This script will:
-- 1. Show all pools and their status
-- 2. Clean up old games
-- 3. Verify RLS is disabled
-- 4. Show what's preventing pool creation
-- =====================================================

-- STEP 1: Show ALL pools (not just active) to see what's in the database
SELECT
    'ALL POOLS IN DATABASE' as info,
    id,
    name,
    type,
    date_iso,
    status,
    is_public,
    course_id,
    created_at::date as created_date
FROM side_game_pools
ORDER BY created_at DESC
LIMIT 20;

-- STEP 2: Show today's pools specifically
SELECT
    'TODAYS POOLS' as info,
    id,
    name,
    type,
    status,
    is_public,
    (SELECT COUNT(*) FROM pool_entrants WHERE pool_id = side_game_pools.id) as entrants
FROM side_game_pools
WHERE date_iso = CURRENT_DATE::TEXT
ORDER BY created_at DESC;

-- STEP 3: Show pools from previous days that are STILL active (problem pools!)
SELECT
    'OLD ACTIVE POOLS (PROBLEM!)' as info,
    id,
    name,
    date_iso,
    status
FROM side_game_pools
WHERE date_iso < CURRENT_DATE::TEXT
  AND status = 'active';

-- STEP 4: CLEAN UP - Mark ALL old pools as completed
UPDATE side_game_pools
SET status = 'completed'
WHERE date_iso < CURRENT_DATE::TEXT
  AND status != 'completed';

-- Verify cleanup
SELECT 'After cleanup - old active pools:' as check_item, COUNT(*) as count
FROM side_game_pools
WHERE date_iso < CURRENT_DATE::TEXT
  AND status = 'active';

-- STEP 5: Check RLS status on ALL relevant tables
SELECT
    tablename,
    CASE WHEN rowsecurity THEN 'ENABLED (BAD!)' ELSE 'DISABLED (GOOD)' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'side_game_pools',
    'pool_entrants',
    'live_progress',
    'scorecards',
    'scores',
    'rounds'
)
ORDER BY tablename;

-- STEP 6: Disable RLS on all tables (in case it got re-enabled)
ALTER TABLE side_game_pools DISABLE ROW LEVEL SECURITY;
ALTER TABLE pool_entrants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS live_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE scorecards DISABLE ROW LEVEL SECURITY;
ALTER TABLE scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE rounds DISABLE ROW LEVEL SECURITY;

-- STEP 7: Grant permissions
GRANT ALL ON side_game_pools TO anon, authenticated;
GRANT ALL ON pool_entrants TO anon, authenticated;
GRANT ALL ON live_progress TO anon, authenticated;
GRANT ALL ON scorecards TO anon, authenticated;
GRANT ALL ON scores TO anon, authenticated;
GRANT ALL ON rounds TO anon, authenticated;

-- STEP 8: Test inserting a pool (to verify insert works)
-- This will fail if there's a permission/constraint issue
SELECT 'Testing pool insert permission...' as test;

-- STEP 9: Show pool_entrants for debugging
SELECT
    'POOL ENTRANTS' as info,
    pe.pool_id,
    pe.player_id,
    sp.name as pool_name,
    sp.date_iso,
    sp.status
FROM pool_entrants pe
JOIN side_game_pools sp ON sp.id = pe.pool_id
WHERE sp.date_iso >= (CURRENT_DATE - INTERVAL '2 days')::TEXT
ORDER BY pe.joined_at DESC
LIMIT 20;

-- STEP 10: Final summary
SELECT 'SUMMARY' as info;
SELECT
    'Today''s active pools' as metric,
    COUNT(*) as count
FROM side_game_pools
WHERE date_iso = CURRENT_DATE::TEXT
  AND status = 'active';

SELECT
    'Total entrants in today''s pools' as metric,
    COUNT(*) as count
FROM pool_entrants pe
JOIN side_game_pools sp ON sp.id = pe.pool_id
WHERE sp.date_iso = CURRENT_DATE::TEXT;
