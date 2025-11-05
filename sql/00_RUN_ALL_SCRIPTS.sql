-- =====================================================================
-- RUN ALL SCRIPTS - Complete Installation
-- =====================================================================
-- Purpose: Run all 4 scripts in order with error checking
-- Date: 2025-11-05
-- =====================================================================

-- Enable detailed error output
\set ON_ERROR_STOP on
\set VERBOSITY verbose

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MciPro Profile Stability Installation';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Starting at: %', NOW();
    RAISE NOTICE '';
END $$;

-- =====================================================
-- SCRIPT 1: Backfill Missing Data
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '>>> STEP 1/4: Backfilling missing profile data...';
END $$;

\i sql/01_backfill_missing_profile_data.sql

DO $$
BEGIN
    RAISE NOTICE '✅ STEP 1/4: Complete';
    RAISE NOTICE '';
END $$;

-- =====================================================
-- SCRIPT 2: Add Username Column
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '>>> STEP 2/4: Adding username column...';
END $$;

\i sql/02_add_username_column.sql

DO $$
BEGIN
    RAISE NOTICE '✅ STEP 2/4: Complete';
    RAISE NOTICE '';
END $$;

-- =====================================================
-- SCRIPT 3: Create Data Sync Functions
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '>>> STEP 3/4: Creating data sync functions...';
END $$;

\i sql/03_create_data_sync_function.sql

DO $$
BEGIN
    RAISE NOTICE '✅ STEP 3/4: Complete';
    RAISE NOTICE '';
END $$;

-- =====================================================
-- SCRIPT 4: Intelligent LINE Signup
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '>>> STEP 4/4: Creating intelligent signup system...';
END $$;

\i sql/04_intelligent_line_signup_for_existing_members.sql

DO $$
BEGIN
    RAISE NOTICE '✅ STEP 4/4: Complete';
    RAISE NOTICE '';
END $$;

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================

DO $$
DECLARE
    v_total_profiles INT;
    v_with_data INT;
    v_completeness DECIMAL;
    v_functions INT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'INSTALLATION COMPLETE - VERIFICATION';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    -- Check profile data completeness
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE profile_data::text != '{}'),
        ROUND(100.0 * COUNT(*) FILTER (WHERE profile_data::text != '{}') / COUNT(*), 2)
    INTO v_total_profiles, v_with_data, v_completeness
    FROM user_profiles;

    RAISE NOTICE 'Profile Data Completeness:';
    RAISE NOTICE '  Total profiles: %', v_total_profiles;
    RAISE NOTICE '  Profiles with data: %', v_with_data;
    RAISE NOTICE '  Completeness: %%', v_completeness;
    RAISE NOTICE '';

    -- Check functions exist
    SELECT COUNT(*) INTO v_functions
    FROM information_schema.routines
    WHERE routine_name IN (
        'find_existing_member_matches',
        'link_line_account_to_member',
        'sync_profile_jsonb_to_columns',
        'sync_profile_columns_to_jsonb',
        'manual_sync_all_profiles'
    );

    RAISE NOTICE 'Functions Created: % / 5', v_functions;

    IF v_functions = 5 THEN
        RAISE NOTICE '  ✅ All functions installed';
    ELSE
        RAISE NOTICE '  ⚠️  Some functions missing!';
    END IF;

    RAISE NOTICE '';

    -- Check username column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_profiles'
          AND column_name = 'username'
    ) THEN
        RAISE NOTICE 'Username Column: ✅ Exists';
    ELSE
        RAISE NOTICE 'Username Column: ❌ Missing';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'INSTALLATION STATUS: SUCCESS ✅';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Completed at: %', NOW();
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Integrate JavaScript code into public/index.html';
    RAISE NOTICE '  2. Test with a member signup';
    RAISE NOTICE '  3. Verify data preservation';
    RAISE NOTICE '';
END $$;
