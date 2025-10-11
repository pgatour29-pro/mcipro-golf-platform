-- =====================================================================
-- COMPREHENSIVE VERIFICATION SCRIPT - ALL SYSTEMS
-- =====================================================================
-- Run this in Supabase SQL Editor to verify everything is ready
-- Date: 2025-10-11
-- =====================================================================

\echo '=========================================='
\echo 'VERIFICATION REPORT'
\echo '=========================================='
\echo ''

-- =====================================================================
-- 1. CHECK REQUIRED TABLES EXIST
-- =====================================================================
\echo '1. CHECKING REQUIRED TABLES...'
\echo ''

SELECT
    CASE
        WHEN COUNT(*) = 9 THEN '✅ ALL TABLES EXIST'
        ELSE '❌ MISSING TABLES - Expected 9, found ' || COUNT(*)::text
    END as status,
    string_agg(table_name, ', ' ORDER BY table_name) as tables_found
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'user_profiles',
    'rounds',
    'side_game_pools',
    'pool_entrants',
    'live_progress',
    'pool_leaderboards',
    'chat_messages',
    'society_events',
    'event_registrations'
);

\echo ''
\echo 'Individual table check:'
SELECT
    t.table_name,
    CASE WHEN ist.table_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (
    VALUES
        ('user_profiles'),
        ('rounds'),
        ('side_game_pools'),
        ('pool_entrants'),
        ('live_progress'),
        ('pool_leaderboards'),
        ('chat_messages'),
        ('society_events'),
        ('event_registrations')
) AS t(table_name)
LEFT JOIN information_schema.tables ist
    ON t.table_name = ist.table_name
    AND ist.table_schema = 'public'
ORDER BY t.table_name;

-- =====================================================================
-- 2. CHECK SIDE_GAME_POOLS SCHEMA
-- =====================================================================
\echo ''
\echo '2. CHECKING SIDE_GAME_POOLS COLUMNS...'
\echo ''

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'side_game_pools'
ORDER BY ordinal_position;

-- Expected columns check
SELECT
    CASE
        WHEN COUNT(*) >= 10 THEN '✅ ALL COLUMNS EXIST (found ' || COUNT(*)::text || ')'
        ELSE '❌ MISSING COLUMNS - Expected 10+, found ' || COUNT(*)::text
    END as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'side_game_pools'
AND column_name IN (
    'id', 'course_id', 'event_id', 'date_iso', 'type',
    'name', 'is_public', 'config', 'created_by', 'created_at',
    'updated_at', 'status'
);

-- =====================================================================
-- 3. CHECK CHAT_MESSAGES SCHEMA
-- =====================================================================
\echo ''
\echo '3. CHECKING CHAT_MESSAGES COLUMNS...'
\echo ''

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'chat_messages'
ORDER BY ordinal_position;

-- =====================================================================
-- 4. CHECK INDEXES
-- =====================================================================
\echo ''
\echo '4. CHECKING INDEXES...'
\echo ''

SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN (
    'side_game_pools',
    'pool_entrants',
    'live_progress',
    'pool_leaderboards',
    'chat_messages'
)
ORDER BY tablename, indexname;

-- Count indexes
SELECT
    tablename,
    COUNT(*) as index_count,
    CASE
        WHEN tablename = 'side_game_pools' AND COUNT(*) >= 4 THEN '✅'
        WHEN tablename = 'pool_entrants' AND COUNT(*) >= 2 THEN '✅'
        WHEN tablename = 'live_progress' AND COUNT(*) >= 2 THEN '✅'
        WHEN tablename = 'chat_messages' AND COUNT(*) >= 4 THEN '✅'
        ELSE '⚠️'
    END as status
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('side_game_pools', 'pool_entrants', 'live_progress', 'chat_messages')
GROUP BY tablename
ORDER BY tablename;

-- =====================================================================
-- 5. CHECK ROW LEVEL SECURITY (RLS)
-- =====================================================================
\echo ''
\echo '5. CHECKING ROW LEVEL SECURITY...'
\echo ''

SELECT
    tablename,
    rowsecurity,
    CASE
        WHEN rowsecurity THEN '✅ ENABLED'
        ELSE '❌ DISABLED'
    END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'user_profiles',
    'rounds',
    'side_game_pools',
    'pool_entrants',
    'live_progress',
    'pool_leaderboards',
    'chat_messages'
)
ORDER BY tablename;

-- =====================================================================
-- 6. CHECK RLS POLICIES
-- =====================================================================
\echo ''
\echo '6. CHECKING RLS POLICIES...'
\echo ''

SELECT
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    CASE
        WHEN qual IS NOT NULL THEN 'Has USING clause'
        ELSE 'No USING clause'
    END as using_clause,
    CASE
        WHEN with_check IS NOT NULL THEN 'Has WITH CHECK'
        ELSE 'No WITH CHECK'
    END as with_check_clause
FROM pg_policies
WHERE tablename IN (
    'user_profiles',
    'side_game_pools',
    'pool_entrants',
    'live_progress',
    'pool_leaderboards',
    'chat_messages'
)
ORDER BY tablename, policyname;

-- Count policies per table
SELECT
    tablename,
    COUNT(*) as policy_count,
    CASE
        WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*)::text || ' policies'
        ELSE '❌ NO POLICIES'
    END as status
FROM pg_policies
WHERE tablename IN (
    'side_game_pools',
    'pool_entrants',
    'live_progress',
    'chat_messages'
)
GROUP BY tablename
ORDER BY tablename;

-- =====================================================================
-- 7. CHECK HELPER FUNCTIONS
-- =====================================================================
\echo ''
\echo '7. CHECKING HELPER FUNCTIONS...'
\echo ''

SELECT
    routine_name,
    routine_type,
    data_type as return_type,
    CASE
        WHEN routine_name IN (
            'get_pool_cutoff_hole',
            'update_live_progress',
            'update_pool_timestamp',
            'create_user_profile'
        ) THEN '✅ EXISTS'
        ELSE '✅ ' || routine_name
    END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'get_pool_cutoff_hole',
    'update_live_progress',
    'update_pool_timestamp',
    'create_user_profile'
)
ORDER BY routine_name;

-- Check if critical functions exist
SELECT
    CASE
        WHEN COUNT(*) >= 3 THEN '✅ CRITICAL FUNCTIONS EXIST (found ' || COUNT(*)::text || ')'
        ELSE '❌ MISSING FUNCTIONS - Expected 3+, found ' || COUNT(*)::text
    END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'get_pool_cutoff_hole',
    'update_live_progress',
    'create_user_profile'
);

-- =====================================================================
-- 8. CHECK TRIGGERS
-- =====================================================================
\echo ''
\echo '8. CHECKING TRIGGERS...'
\echo ''

SELECT
    trigger_name,
    event_object_table,
    event_manipulation,
    action_timing,
    CASE
        WHEN trigger_name = 'trigger_update_pool_on_entrant_change' THEN '✅ EXISTS'
        ELSE '✅ ' || trigger_name
    END as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table IN ('pool_entrants')
ORDER BY trigger_name;

-- =====================================================================
-- 9. CHECK DATA - SAMPLE QUERIES
-- =====================================================================
\echo ''
\echo '9. CHECKING SAMPLE DATA...'
\echo ''

-- Count users
SELECT
    COUNT(*) as total_users,
    CASE
        WHEN COUNT(*) >= 2 THEN '✅ ' || COUNT(*)::text || ' users (Pete Park & Donald Lump)'
        WHEN COUNT(*) >= 1 THEN '⚠️ Only ' || COUNT(*)::text || ' user'
        ELSE '❌ NO USERS'
    END as status
FROM user_profiles;

-- List users with LINE pictures
SELECT
    name,
    username,
    role,
    CASE
        WHEN profile_data->>'linePictureUrl' IS NOT NULL THEN '✅ Has LINE picture'
        ELSE '⚠️ No LINE picture'
    END as picture_status,
    LEFT(profile_data->>'linePictureUrl', 50) as picture_url_preview
FROM user_profiles
ORDER BY created_at DESC
LIMIT 5;

-- Count active pools today
SELECT
    COUNT(*) as active_pools_today,
    CASE
        WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*)::text || ' active pools'
        ELSE '⚠️ No pools yet (will create during testing)'
    END as status
FROM side_game_pools
WHERE date_iso = CURRENT_DATE::text
AND status = 'active';

-- Count chat messages
SELECT
    COUNT(*) as total_messages,
    CASE
        WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*)::text || ' messages'
        ELSE '⚠️ No messages yet'
    END as status
FROM chat_messages;

-- =====================================================================
-- 10. FOREIGN KEY CONSTRAINTS
-- =====================================================================
\echo ''
\echo '10. CHECKING FOREIGN KEY CONSTRAINTS...'
\echo ''

SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    '✅ FK exists' as status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND tc.table_name IN (
    'pool_entrants',
    'live_progress',
    'pool_leaderboards'
)
ORDER BY tc.table_name, kcu.column_name;

-- =====================================================================
-- SUMMARY
-- =====================================================================
\echo ''
\echo '=========================================='
\echo 'VERIFICATION SUMMARY'
\echo '=========================================='
\echo ''

-- Final checklist
SELECT
    '✅ Tables' as category,
    CASE
        WHEN (SELECT COUNT(*) FROM information_schema.tables
              WHERE table_schema = 'public'
              AND table_name IN ('side_game_pools', 'pool_entrants', 'live_progress', 'chat_messages')) >= 4
        THEN 'PASS'
        ELSE 'FAIL'
    END as status
UNION ALL
SELECT
    '✅ RLS Enabled' as category,
    CASE
        WHEN (SELECT COUNT(*) FROM pg_tables
              WHERE schemaname = 'public'
              AND tablename IN ('side_game_pools', 'pool_entrants', 'live_progress', 'chat_messages')
              AND rowsecurity = true) >= 4
        THEN 'PASS'
        ELSE 'FAIL'
    END as status
UNION ALL
SELECT
    '✅ Policies' as category,
    CASE
        WHEN (SELECT COUNT(*) FROM pg_policies
              WHERE tablename IN ('side_game_pools', 'pool_entrants', 'live_progress', 'chat_messages')) >= 8
        THEN 'PASS'
        ELSE 'FAIL'
    END as status
UNION ALL
SELECT
    '✅ Functions' as category,
    CASE
        WHEN (SELECT COUNT(*) FROM information_schema.routines
              WHERE routine_schema = 'public'
              AND routine_name IN ('get_pool_cutoff_hole', 'update_live_progress')) >= 2
        THEN 'PASS'
        ELSE 'FAIL'
    END as status
UNION ALL
SELECT
    '✅ Users' as category,
    CASE
        WHEN (SELECT COUNT(*) FROM user_profiles) >= 2
        THEN 'PASS'
        ELSE 'WARN - Need 2 users for testing'
    END as status;

\echo ''
\echo '=========================================='
\echo 'NEXT STEPS:'
\echo '=========================================='
\echo '1. If any FAIL status above:'
\echo '   - Run sql/side_game_pools_schema.sql'
\echo '   - Run sql/chat_messages_schema.sql'
\echo ''
\echo '2. If all PASS:'
\echo '   - Proceed to testing!'
\echo '   - Follow sql/test_multi_group_competition.md'
\echo ''
\echo '3. If WARN on Users:'
\echo '   - Ensure Pete Park and Donald Lump are created'
\echo '   - Both should have LINE picture URLs'
\echo '=========================================='
