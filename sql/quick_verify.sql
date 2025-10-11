-- =====================================================================
-- QUICK VERIFICATION - Single Query
-- =====================================================================
-- Run this in Supabase SQL Editor
-- Copy and paste the results back to Claude
-- =====================================================================

SELECT
    'TABLES CHECK' as check_type,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'side_game_pools')
        THEN '✅ side_game_pools EXISTS'
        ELSE '❌ side_game_pools MISSING'
    END as side_game_pools,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pool_entrants')
        THEN '✅ pool_entrants EXISTS'
        ELSE '❌ pool_entrants MISSING'
    END as pool_entrants,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'live_progress')
        THEN '✅ live_progress EXISTS'
        ELSE '❌ live_progress MISSING'
    END as live_progress,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_messages')
        THEN '✅ chat_messages EXISTS'
        ELSE '❌ chat_messages MISSING'
    END as chat_messages,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_pool_cutoff_hole')
        THEN '✅ get_pool_cutoff_hole EXISTS'
        ELSE '❌ get_pool_cutoff_hole MISSING'
    END as functions,
    (SELECT COUNT(*)::text || ' users' FROM user_profiles) as users;
