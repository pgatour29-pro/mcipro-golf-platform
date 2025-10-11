-- =====================================================================
-- SUPABASE-COMPATIBLE VERIFICATION SCRIPT - ALL SYSTEMS
-- =====================================================================
-- Run this in Supabase SQL Editor to verify everything is ready
-- Date: 2025-10-11
-- =====================================================================

-- =====================================================================
-- SECTION 1: CHECK REQUIRED TABLES EXIST
-- =====================================================================
SELECT '========================================' as "VERIFICATION REPORT";
SELECT '1. CHECKING REQUIRED TABLES...' as "Section";

-- Check if all tables exist
SELECT
    CASE
        WHEN COUNT(*) >= 8 THEN '✅ TABLES FOUND: ' || COUNT(*)::text || ' (Expected: 8+)'
        ELSE '❌ MISSING TABLES - Expected 8+, found ' || COUNT(*)::text
    END as "Status"
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
    'society_events'
);

-- Individual table check
SELECT
    t.table_name as "Table Name",
    CASE WHEN ist.table_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as "Status"
FROM (
    VALUES
        ('user_profiles'),
        ('rounds'),
        ('side_game_pools'),
        ('pool_entrants'),
        ('live_progress'),
        ('pool_leaderboards'),
        ('chat_messages'),
        ('society_events')
) AS t(table_name)
LEFT JOIN information_schema.tables ist
    ON t.table_name = ist.table_name
    AND ist.table_schema = 'public'
ORDER BY t.table_name;

-- =====================================================================
-- SECTION 2: CHECK SIDE_GAME_POOLS COLUMNS
-- =====================================================================
SELECT '========================================' as "Section Break";
SELECT '2. CHECKING SIDE_GAME_POOLS SCHEMA...' as "Section";

-- Check if side_game_pools exists first
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'side_game_pools')
        THEN '✅ side_game_pools table EXISTS'
        ELSE '❌ side_game_pools table MISSING - Run sql/side_game_pools_schema.sql'
    END as "Table Status";

-- Show columns only if table exists
SELECT
    column_name as "Column",
    data_type as "Type",
    is_nullable as "Nullable"
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'side_game_pools'
ORDER BY ordinal_position;

-- =====================================================================
-- SECTION 3: CHECK CHAT_MESSAGES SCHEMA
-- =====================================================================
SELECT '========================================' as "Section Break";
SELECT '3. CHECKING CHAT_MESSAGES SCHEMA...' as "Section";

-- Check if chat_messages exists
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_messages')
        THEN '✅ chat_messages table EXISTS'
        ELSE '❌ chat_messages table MISSING - Run sql/chat_messages_schema.sql'
    END as "Table Status";

-- Show columns only if table exists
SELECT
    column_name as "Column",
    data_type as "Type",
    is_nullable as "Nullable"
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'chat_messages'
ORDER BY ordinal_position;

-- =====================================================================
-- SECTION 4: CHECK INDEXES
-- =====================================================================
SELECT '========================================' as "Section Break";
SELECT '4. CHECKING INDEXES...' as "Section";

-- Count indexes per table
SELECT
    tablename as "Table",
    COUNT(*) as "Index Count",
    CASE
        WHEN tablename = 'side_game_pools' AND COUNT(*) >= 4 THEN '✅ Good'
        WHEN tablename = 'pool_entrants' AND COUNT(*) >= 2 THEN '✅ Good'
        WHEN tablename = 'live_progress' AND COUNT(*) >= 2 THEN '✅ Good'
        WHEN tablename = 'chat_messages' AND COUNT(*) >= 4 THEN '✅ Good'
        WHEN tablename = 'user_profiles' AND COUNT(*) >= 1 THEN '✅ Good'
        WHEN COUNT(*) > 0 THEN '⚠️ Has indexes'
        ELSE '❌ No indexes'
    END as "Status"
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('side_game_pools', 'pool_entrants', 'live_progress', 'chat_messages', 'user_profiles', 'rounds')
GROUP BY tablename
ORDER BY tablename;

-- =====================================================================
-- SECTION 5: CHECK ROW LEVEL SECURITY (RLS)
-- =====================================================================
SELECT '========================================' as "Section Break";
SELECT '5. CHECKING ROW LEVEL SECURITY...' as "Section";

SELECT
    tablename as "Table",
    CASE
        WHEN rowsecurity THEN '✅ ENABLED'
        ELSE '❌ DISABLED'
    END as "RLS Status"
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
-- SECTION 6: CHECK RLS POLICIES
-- =====================================================================
SELECT '========================================' as "Section Break";
SELECT '6. CHECKING RLS POLICIES...' as "Section";

-- Count policies per table
SELECT
    tablename as "Table",
    COUNT(*) as "Policy Count",
    CASE
        WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*)::text || ' policies'
        ELSE '❌ NO POLICIES'
    END as "Status"
FROM pg_policies
WHERE tablename IN (
    'user_profiles',
    'side_game_pools',
    'pool_entrants',
    'live_progress',
    'pool_leaderboards',
    'chat_messages'
)
GROUP BY tablename
ORDER BY tablename;

-- =====================================================================
-- SECTION 7: CHECK HELPER FUNCTIONS
-- =====================================================================
SELECT '========================================' as "Section Break";
SELECT '7. CHECKING HELPER FUNCTIONS...' as "Section";

-- Check critical functions exist
SELECT
    routine_name as "Function Name",
    data_type as "Returns",
    '✅ EXISTS' as "Status"
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'get_pool_cutoff_hole',
    'update_live_progress',
    'create_user_profile'
)
ORDER BY routine_name;

-- Summary check
SELECT
    CASE
        WHEN COUNT(*) >= 2 THEN '✅ CRITICAL FUNCTIONS EXIST: ' || COUNT(*)::text || ' (Expected: 2+)'
        ELSE '❌ MISSING FUNCTIONS - Expected 2+, found ' || COUNT(*)::text
    END as "Function Status"
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'get_pool_cutoff_hole',
    'update_live_progress',
    'create_user_profile'
);

-- =====================================================================
-- SECTION 8: CHECK DATA - USERS
-- =====================================================================
SELECT '========================================' as "Section Break";
SELECT '8. CHECKING USER DATA...' as "Section";

-- Count users
SELECT
    COUNT(*) as "Total Users",
    CASE
        WHEN COUNT(*) >= 2 THEN '✅ ' || COUNT(*)::text || ' users (Need Pete Park & Donald Lump)'
        WHEN COUNT(*) >= 1 THEN '⚠️ Only ' || COUNT(*)::text || ' user - Need 2 for testing'
        ELSE '❌ NO USERS - Need to login via LINE'
    END as "Status"
FROM user_profiles;

-- List users with LINE pictures
SELECT
    name as "User Name",
    role as "Role",
    CASE
        WHEN profile_data->>'linePictureUrl' IS NOT NULL THEN '✅ Has LINE picture'
        ELSE '⚠️ No LINE picture'
    END as "Picture Status",
    LEFT(COALESCE(profile_data->>'linePictureUrl', 'None'), 60) as "Picture URL Preview"
FROM user_profiles
ORDER BY created_at DESC;

-- =====================================================================
-- SECTION 9: CHECK DATA - POOLS
-- =====================================================================
SELECT '========================================' as "Section Break";
SELECT '9. CHECKING POOL DATA...' as "Section";

-- Count active pools today
SELECT
    COUNT(*) as "Active Pools Today",
    CASE
        WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*)::text || ' active pools'
        ELSE '⚠️ No pools yet (normal - will create during testing)'
    END as "Status"
FROM side_game_pools
WHERE date_iso = CURRENT_DATE::text
AND status = 'active';

-- Show existing pools if any
SELECT
    type as "Pool Type",
    name as "Pool Name",
    course_id as "Course",
    is_public as "Public?",
    (SELECT COUNT(*) FROM pool_entrants WHERE pool_id = side_game_pools.id) as "Entrants"
FROM side_game_pools
WHERE date_iso = CURRENT_DATE::text
ORDER BY created_at DESC
LIMIT 5;

-- =====================================================================
-- SECTION 10: CHECK DATA - CHAT MESSAGES
-- =====================================================================
SELECT '========================================' as "Section Break";
SELECT '10. CHECKING CHAT MESSAGES...' as "Section";

-- Count chat messages
SELECT
    COUNT(*) as "Total Messages",
    CASE
        WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*)::text || ' messages'
        ELSE '⚠️ No messages yet (normal if not tested)'
    END as "Status"
FROM chat_messages;

-- =====================================================================
-- FINAL SUMMARY
-- =====================================================================
SELECT '========================================' as "Section Break";
SELECT 'VERIFICATION SUMMARY' as "Final Report";
SELECT '========================================' as "Section Break";

-- Final checklist
SELECT
    'Tables' as "Category",
    CASE
        WHEN (SELECT COUNT(*) FROM information_schema.tables
              WHERE table_schema = 'public'
              AND table_name IN ('side_game_pools', 'pool_entrants', 'live_progress', 'chat_messages')) >= 4
        THEN '✅ PASS'
        ELSE '❌ FAIL - Run sql/side_game_pools_schema.sql and sql/chat_messages_schema.sql'
    END as "Status"
UNION ALL
SELECT
    'RLS Enabled' as "Category",
    CASE
        WHEN (SELECT COUNT(*) FROM pg_tables
              WHERE schemaname = 'public'
              AND tablename IN ('side_game_pools', 'pool_entrants', 'live_progress', 'chat_messages')
              AND rowsecurity = true) >= 4
        THEN '✅ PASS'
        ELSE '❌ FAIL - Check RLS in schema files'
    END as "Status"
UNION ALL
SELECT
    'Policies' as "Category",
    CASE
        WHEN (SELECT COUNT(*) FROM pg_policies
              WHERE tablename IN ('side_game_pools', 'pool_entrants', 'live_progress', 'chat_messages')) >= 8
        THEN '✅ PASS'
        ELSE '⚠️ WARN - Should have 8+ policies'
    END as "Status"
UNION ALL
SELECT
    'Functions' as "Category",
    CASE
        WHEN (SELECT COUNT(*) FROM information_schema.routines
              WHERE routine_schema = 'public'
              AND routine_name IN ('get_pool_cutoff_hole', 'update_live_progress')) >= 2
        THEN '✅ PASS'
        ELSE '❌ FAIL - Run sql/side_game_pools_schema.sql'
    END as "Status"
UNION ALL
SELECT
    'Users' as "Category",
    CASE
        WHEN (SELECT COUNT(*) FROM user_profiles) >= 2
        THEN '✅ PASS'
        ELSE '⚠️ WARN - Need 2 users (Pete Park & Donald Lump) to test'
    END as "Status";

-- Next steps message
SELECT '========================================' as "Next Steps";
SELECT 'IF ANY FAIL STATUS ABOVE:' as "Instructions";
SELECT '  1. Run sql/side_game_pools_schema.sql for missing pool tables/functions' as "Step";
SELECT '  2. Run sql/chat_messages_schema.sql for missing chat table' as "Step";
SELECT '  3. Login as Pete Park and Donald Lump via LINE if users missing' as "Step";
SELECT '' as "Blank";
SELECT 'IF ALL PASS:' as "Instructions";
SELECT '  ✅ READY TO TEST!' as "Step";
SELECT '  Follow: sql/test_multi_group_competition.md' as "Step";
SELECT '========================================' as "End";
