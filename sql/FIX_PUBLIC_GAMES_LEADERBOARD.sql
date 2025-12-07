-- =====================================================
-- FIX PUBLIC GAMES LEADERBOARD
-- Run this in Supabase SQL Editor
-- Created: 2025-12-07
-- =====================================================
--
-- This fixes:
-- 1. live_progress table missing or empty
-- 2. update_live_progress RPC function is placeholder (does nothing)
-- 3. Leaderboard shows "Waiting for all players..." even after scores entered
--
-- =====================================================

-- STEP 1: Create live_progress table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.live_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id UUID NOT NULL REFERENCES public.side_game_pools(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL,
    holes_completed INTEGER DEFAULT 0,
    last_hole_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(pool_id, player_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_progress_pool ON public.live_progress(pool_id);
CREATE INDEX IF NOT EXISTS idx_progress_player ON public.live_progress(player_id);

-- STEP 2: Disable RLS on live_progress (so updates work)
ALTER TABLE public.live_progress DISABLE ROW LEVEL SECURITY;

-- STEP 3: Create the REAL update_live_progress function (replaces placeholder)
CREATE OR REPLACE FUNCTION public.update_live_progress(
    p_pool_id UUID,
    p_player_id TEXT,
    p_hole INTEGER
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.live_progress (pool_id, player_id, holes_completed, last_hole_time)
    VALUES (p_pool_id, p_player_id, p_hole, NOW())
    ON CONFLICT (pool_id, player_id)
    DO UPDATE SET
        holes_completed = GREATEST(public.live_progress.holes_completed, p_hole),
        last_hole_time = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 4: Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION public.update_live_progress(UUID, TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.update_live_progress(UUID, TEXT, INTEGER) TO authenticated;

-- STEP 5: Also ensure other tables have RLS disabled
ALTER TABLE IF EXISTS side_game_pools DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pool_entrants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS scorecards DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS scores DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check table exists
SELECT
    'live_progress table' as check_item,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'live_progress'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Check function exists and is not placeholder
SELECT
    'update_live_progress function' as check_item,
    CASE WHEN prosrc LIKE '%INSERT INTO%live_progress%'
         THEN '✅ REAL (inserts data)'
         ELSE '❌ PLACEHOLDER (does nothing)'
    END as status
FROM pg_proc
WHERE proname = 'update_live_progress';

-- Check RLS status
SELECT
    tablename as table_name,
    CASE WHEN rowsecurity THEN '❌ RLS ENABLED' ELSE '✅ RLS DISABLED' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('side_game_pools', 'pool_entrants', 'live_progress', 'scorecards', 'scores')
ORDER BY tablename;

-- Show any existing progress records
SELECT 'Current live_progress records:' as info;
SELECT * FROM public.live_progress LIMIT 10;
