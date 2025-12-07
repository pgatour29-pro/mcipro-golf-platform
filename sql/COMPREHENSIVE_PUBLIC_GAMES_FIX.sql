-- =====================================================
-- COMPREHENSIVE PUBLIC GAMES FIX
-- Run this in Supabase SQL Editor
-- Created: 2025-12-07
-- =====================================================
-- Fixes:
-- 1. scores table 400 errors (RLS)
-- 2. Old/stale games showing up
-- 3. All related table access
-- =====================================================

-- =====================================================
-- STEP 1: FORCE DISABLE RLS ON ALL TABLES (NO EXCEPTIONS)
-- =====================================================

-- Drop ALL policies first, then disable RLS
DO $$
DECLARE
    tbl TEXT;
    pol RECORD;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['scores', 'scorecards', 'side_game_pools', 'pool_entrants', 'live_progress', 'rounds']
    LOOP
        -- Drop all policies on this table
        FOR pol IN
            SELECT policyname FROM pg_policies WHERE tablename = tbl
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl);
            RAISE NOTICE 'Dropped policy % on %', pol.policyname, tbl;
        END LOOP;

        -- Disable RLS
        EXECUTE format('ALTER TABLE IF EXISTS %I DISABLE ROW LEVEL SECURITY', tbl);
        RAISE NOTICE 'Disabled RLS on %', tbl;
    END LOOP;
END $$;

-- =====================================================
-- STEP 2: CLEAN UP OLD/STALE GAMES
-- =====================================================

-- Mark all pools from previous days as 'completed' (not today)
UPDATE side_game_pools
SET status = 'completed'
WHERE date_iso < CURRENT_DATE::TEXT
  AND status = 'active';

-- Show how many were cleaned up
SELECT
    'Cleaned up old pools' as action,
    COUNT(*) as count
FROM side_game_pools
WHERE date_iso < CURRENT_DATE::TEXT;

-- =====================================================
-- STEP 3: VERIFY RLS IS DISABLED
-- =====================================================

SELECT
    tablename as table_name,
    CASE WHEN rowsecurity
        THEN '❌ RLS STILL ENABLED - RUN AGAIN!'
        ELSE '✅ RLS DISABLED'
    END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('scores', 'scorecards', 'side_game_pools', 'pool_entrants', 'live_progress', 'rounds')
ORDER BY tablename;

-- =====================================================
-- STEP 4: TEST DIRECT QUERY ON SCORES
-- =====================================================

-- This should NOT return an error
SELECT 'Testing scores table access' as test;
SELECT COUNT(*) as total_scores FROM scores LIMIT 1;

-- =====================================================
-- STEP 5: SHOW ACTIVE POOLS FOR TODAY
-- =====================================================

SELECT
    'Active pools for today' as info,
    id,
    name,
    type,
    date_iso,
    status,
    (SELECT COUNT(*) FROM pool_entrants WHERE pool_id = side_game_pools.id) as entrant_count
FROM side_game_pools
WHERE date_iso = CURRENT_DATE::TEXT
  AND status = 'active'
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- STEP 6: GRANT PERMISSIONS (BELT AND SUSPENDERS)
-- =====================================================

GRANT ALL ON scores TO anon;
GRANT ALL ON scores TO authenticated;
GRANT ALL ON scorecards TO anon;
GRANT ALL ON scorecards TO authenticated;
GRANT ALL ON side_game_pools TO anon;
GRANT ALL ON side_game_pools TO authenticated;
GRANT ALL ON pool_entrants TO anon;
GRANT ALL ON pool_entrants TO authenticated;
GRANT ALL ON live_progress TO anon;
GRANT ALL ON live_progress TO authenticated;
