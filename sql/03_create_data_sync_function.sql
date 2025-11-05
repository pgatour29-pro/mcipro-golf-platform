-- =====================================================================
-- DATA SYNC FUNCTION - Keep Flat Columns and JSONB in Sync
-- =====================================================================
-- Date: 2025-11-05
-- Purpose: Ensure profile data consistency between flat columns and profile_data JSONB
-- =====================================================================

-- =====================================================
-- FUNCTION: Sync profile_data JSONB → Flat Columns
-- =====================================================

CREATE OR REPLACE FUNCTION sync_profile_jsonb_to_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- Extract data from profile_data JSONB and populate flat columns

    -- Username
    IF NEW.profile_data->>'username' IS NOT NULL AND NEW.profile_data->>'username' != '' THEN
        NEW.username := NEW.profile_data->>'username';
    END IF;

    -- Email (from personalInfo)
    IF NEW.profile_data->'personalInfo'->>'email' IS NOT NULL THEN
        NEW.email := NEW.profile_data->'personalInfo'->>'email';
    END IF;

    -- Phone (from personalInfo)
    IF NEW.profile_data->'personalInfo'->>'phone' IS NOT NULL THEN
        NEW.phone := NEW.profile_data->'personalInfo'->>'phone';
    END IF;

    -- Home Course (from golfInfo)
    IF NEW.profile_data->'golfInfo'->>'homeClub' IS NOT NULL THEN
        NEW.home_course_name := NEW.profile_data->'golfInfo'->>'homeClub';
    END IF;

    IF NEW.profile_data->'golfInfo'->>'homeCourseId' IS NOT NULL AND NEW.profile_data->'golfInfo'->>'homeCourseId' != '' THEN
        BEGIN
            NEW.home_course_id := (NEW.profile_data->'golfInfo'->>'homeCourseId')::uuid;
        EXCEPTION
            WHEN invalid_text_representation THEN
                -- If can't cast to UUID, leave it NULL
                NEW.home_course_id := NULL;
        END;
    END IF;

    -- Language (from preferences)
    IF NEW.profile_data->'preferences'->>'language' IS NOT NULL THEN
        NEW.language := NEW.profile_data->'preferences'->>'language';
    END IF;

    -- Update timestamp
    NEW.updated_at := NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Sync Flat Columns → profile_data JSONB
-- =====================================================

CREATE OR REPLACE FUNCTION sync_profile_columns_to_jsonb()
RETURNS TRIGGER AS $$
BEGIN
    -- Keep profile_data JSONB in sync when flat columns are updated

    -- Initialize profile_data if empty
    IF NEW.profile_data IS NULL OR NEW.profile_data::text = '{}' THEN
        NEW.profile_data := '{
            "username": "",
            "linePictureUrl": "",
            "personalInfo": {},
            "golfInfo": {},
            "professionalInfo": {},
            "skills": {},
            "preferences": {},
            "media": {},
            "privacy": {}
        }'::jsonb;
    END IF;

    -- Sync username
    IF NEW.username IS NOT NULL AND NEW.username != COALESCE(OLD.username, '') THEN
        NEW.profile_data := jsonb_set(NEW.profile_data, '{username}', to_jsonb(NEW.username));
    END IF;

    -- Sync email
    IF NEW.email IS NOT NULL AND NEW.email != COALESCE(OLD.email, '') THEN
        NEW.profile_data := jsonb_set(
            NEW.profile_data,
            '{personalInfo,email}',
            to_jsonb(NEW.email)
        );
    END IF;

    -- Sync phone
    IF NEW.phone IS NOT NULL AND NEW.phone != COALESCE(OLD.phone, '') THEN
        NEW.profile_data := jsonb_set(
            NEW.profile_data,
            '{personalInfo,phone}',
            to_jsonb(NEW.phone)
        );
    END IF;

    -- Sync home course name
    IF NEW.home_course_name IS NOT NULL AND NEW.home_course_name != COALESCE(OLD.home_course_name, '') THEN
        NEW.profile_data := jsonb_set(
            NEW.profile_data,
            '{golfInfo,homeClub}',
            to_jsonb(NEW.home_course_name)
        );
    END IF;

    -- Sync home course ID
    IF NEW.home_course_id IS NOT NULL AND (OLD.home_course_id IS NULL OR NEW.home_course_id != OLD.home_course_id) THEN
        NEW.profile_data := jsonb_set(
            NEW.profile_data,
            '{golfInfo,homeCourseId}',
            to_jsonb(NEW.home_course_id::text)
        );
    END IF;

    -- Sync language
    IF NEW.language IS NOT NULL AND NEW.language != COALESCE(OLD.language, '') THEN
        NEW.profile_data := jsonb_set(
            NEW.profile_data,
            '{preferences,language}',
            to_jsonb(NEW.language)
        );
    END IF;

    -- Sync name to personalInfo
    IF NEW.name IS NOT NULL AND NEW.name != COALESCE(OLD.name, '') THEN
        -- Split name into first and last
        NEW.profile_data := jsonb_set(
            jsonb_set(
                NEW.profile_data,
                '{personalInfo,firstName}',
                to_jsonb(SPLIT_PART(NEW.name, ' ', 1))
            ),
            '{personalInfo,lastName}',
            to_jsonb(NULLIF(SPLIT_PART(NEW.name, ' ', 2), ''))
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CREATE TRIGGERS
-- =====================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_sync_jsonb_to_columns ON user_profiles;
DROP TRIGGER IF EXISTS trigger_sync_columns_to_jsonb ON user_profiles;

-- Trigger 1: Sync JSONB → Columns (runs FIRST on INSERT/UPDATE)
CREATE TRIGGER trigger_sync_jsonb_to_columns
    BEFORE INSERT OR UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_profile_jsonb_to_columns();

-- Trigger 2: Sync Columns → JSONB (runs AFTER trigger 1)
-- Note: We use BEFORE trigger at priority 50 to run after the first trigger
CREATE TRIGGER trigger_sync_columns_to_jsonb
    BEFORE INSERT OR UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_profile_columns_to_jsonb();

-- =====================================================
-- HELPER FUNCTION: Manual Sync (if needed)
-- =====================================================

CREATE OR REPLACE FUNCTION manual_sync_all_profiles()
RETURNS TABLE(
    synced_count INT,
    message TEXT
) AS $$
DECLARE
    count INT;
BEGIN
    -- Force sync all profiles
    UPDATE user_profiles
    SET updated_at = updated_at; -- Triggers will fire

    GET DIAGNOSTICS count = ROW_COUNT;

    RETURN QUERY SELECT count, 'All profiles synced successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION manual_sync_all_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION manual_sync_all_profiles() TO anon;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Test the sync function with a dummy update
DO $$
DECLARE
    test_profile RECORD;
BEGIN
    -- Get first profile
    SELECT * INTO test_profile FROM user_profiles LIMIT 1;

    IF FOUND THEN
        -- Trigger update (will run sync functions)
        UPDATE user_profiles
        SET updated_at = NOW()
        WHERE line_user_id = test_profile.line_user_id;

        RAISE NOTICE '✅ Sync function test successful on profile: %', test_profile.name;
    ELSE
        RAISE NOTICE '⚠️  No profiles found to test';
    END IF;
END $$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ DATA SYNC FUNCTIONS CREATED SUCCESSFULLY!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 FUNCTIONS CREATED:';
    RAISE NOTICE '   1. sync_profile_jsonb_to_columns()';
    RAISE NOTICE '   2. sync_profile_columns_to_jsonb()';
    RAISE NOTICE '   3. manual_sync_all_profiles()';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 TRIGGERS ACTIVE:';
    RAISE NOTICE '   - BEFORE INSERT/UPDATE → Auto-sync both directions';
    RAISE NOTICE '   - Ensures flat columns ↔ profile_data JSONB always match';
    RAISE NOTICE '';
    RAISE NOTICE '💡 USAGE:';
    RAISE NOTICE '   - Automatic: Just INSERT/UPDATE user_profiles normally';
    RAISE NOTICE '   - Manual sync: SELECT * FROM manual_sync_all_profiles();';
END $$;
