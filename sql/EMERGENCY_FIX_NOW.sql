-- =====================================================
-- EMERGENCY FIX - RUN THIS NOW
-- Copy and paste this ENTIRE thing into Supabase SQL Editor
-- =====================================================

-- STEP 1: Delete ALL old pool entrants first (foreign key constraint)
DELETE FROM pool_entrants WHERE pool_id IN (
    SELECT id FROM side_game_pools WHERE date_iso != '2025-12-07'
);

-- STEP 2: Delete ALL old pools (not from today)
DELETE FROM side_game_pools WHERE date_iso != '2025-12-07';

-- STEP 3: Add missing stableford_points column
ALTER TABLE scores ADD COLUMN IF NOT EXISTS stableford_points INTEGER DEFAULT 0;

-- STEP 4: Disable ALL RLS
ALTER TABLE scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE scorecards DISABLE ROW LEVEL SECURITY;
ALTER TABLE side_game_pools DISABLE ROW LEVEL SECURITY;
ALTER TABLE pool_entrants DISABLE ROW LEVEL SECURITY;
ALTER TABLE live_progress DISABLE ROW LEVEL SECURITY;

-- STEP 5: Drop ALL policies on these tables
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname, tablename FROM pg_policies
        WHERE tablename IN ('scores','scorecards','side_game_pools','pool_entrants','live_progress')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
        RAISE NOTICE 'Dropped: %', pol.policyname;
    END LOOP;
END $$;

-- STEP 6: Grant full permissions
GRANT ALL ON scores TO anon, authenticated;
GRANT ALL ON scorecards TO anon, authenticated;
GRANT ALL ON side_game_pools TO anon, authenticated;
GRANT ALL ON pool_entrants TO anon, authenticated;
GRANT ALL ON live_progress TO anon, authenticated;

-- STEP 7: Show what's left
SELECT 'REMAINING POOLS' as info, id, name, type, date_iso, status,
       (SELECT COUNT(*) FROM pool_entrants WHERE pool_id = side_game_pools.id) as entrants
FROM side_game_pools
WHERE status = 'active'
ORDER BY created_at DESC;

SELECT 'TOTAL ACTIVE TODAY' as metric, COUNT(*) as count
FROM side_game_pools
WHERE date_iso = '2025-12-07' AND status = 'active';
