-- =====================================================================
-- QUICK FIX FOR SUPABASE - Run this FIRST before other scripts
-- =====================================================================
-- Purpose: Fix UUID casting issues in user_profiles table
-- This allows the other scripts to run without errors
-- =====================================================================

-- Check if home_course_id is UUID or TEXT
DO $$
DECLARE
    v_data_type TEXT;
BEGIN
    SELECT data_type INTO v_data_type
    FROM information_schema.columns
    WHERE table_name = 'user_profiles'
      AND column_name = 'home_course_id';

    RAISE NOTICE 'home_course_id column type: %', COALESCE(v_data_type, 'DOES NOT EXIST');

    IF v_data_type = 'uuid' THEN
        RAISE NOTICE '✅ Column is UUID - scripts will handle casting';
    ELSIF v_data_type = 'text' OR v_data_type = 'character varying' THEN
        RAISE NOTICE '✅ Column is TEXT - no casting needed';
    ELSIF v_data_type IS NULL THEN
        RAISE NOTICE '⚠️  Column does not exist - will be created as TEXT';
    ELSE
        RAISE NOTICE '⚠️  Column is % - unexpected type', v_data_type;
    END IF;
END $$;

-- If home_course_id doesn't exist, add it as TEXT (not UUID)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_profiles'
          AND column_name = 'home_course_id'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN home_course_id TEXT;
        RAISE NOTICE '✅ Added home_course_id column as TEXT';
    END IF;
END $$;

-- If society_id doesn't exist, add it as UUID
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_profiles'
          AND column_name = 'society_id'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN society_id UUID;
        RAISE NOTICE '✅ Added society_id column as UUID';
    END IF;
END $$;

-- Verify table structure
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
  AND column_name IN ('home_course_id', 'home_course_name', 'society_id', 'society_name', 'username', 'profile_data')
ORDER BY ordinal_position;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Quick fix complete! You can now run the other scripts.';
END $$;
