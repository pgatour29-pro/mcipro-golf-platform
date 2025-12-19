-- =====================================================
-- CLEANUP OLD POOLS - Run this in Supabase SQL Editor
-- This script marks old pools as 'completed' so they
-- won't show up in the Join Games list
-- =====================================================

-- First, show current active pools and their dates
SELECT 'CURRENT ACTIVE POOLS' as info;
SELECT id, name, type, date_iso, status, created_at,
       (SELECT COUNT(*) FROM pool_entrants WHERE pool_id = side_game_pools.id) as entrants
FROM side_game_pools
WHERE status = 'active'
ORDER BY created_at DESC;

-- Show count by date
SELECT 'POOLS BY DATE' as info;
SELECT date_iso, COUNT(*) as pool_count
FROM side_game_pools
WHERE status = 'active'
GROUP BY date_iso
ORDER BY date_iso DESC;

-- Mark all pools from previous days as completed
-- Cast both to TEXT for comparison (date_iso is stored as TEXT like '2025-12-07')
UPDATE side_game_pools
SET status = 'completed'
WHERE status = 'active'
  AND date_iso < TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD');

-- Show how many were updated
SELECT 'CLEANUP COMPLETE' as info;
SELECT date_iso, COUNT(*) as pools_closed
FROM side_game_pools
WHERE status = 'completed'
  AND date_iso < TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')
GROUP BY date_iso
ORDER BY date_iso DESC;

-- Verify only today's pools remain active
SELECT 'REMAINING ACTIVE POOLS (Today Only)' as info;
SELECT id, name, type, date_iso, status, created_at,
       (SELECT COUNT(*) FROM pool_entrants WHERE pool_id = side_game_pools.id) as entrants
FROM side_game_pools
WHERE status = 'active'
ORDER BY created_at DESC;
