-- =====================================================================
-- DIAGNOSTIC: Check Pete's ACTUAL Current Database State
-- =====================================================================
-- This will show EXACTLY what is in the database right now
-- Run this in Supabase SQL Editor to see the truth
-- =====================================================================

-- Pete's full profile - EVERYTHING
SELECT
    '=== PETE FULL PROFILE ===' as section,
    line_user_id,
    name,
    role,
    email,
    phone,

    -- OLD deprecated field
    home_club as old_home_club_column,

    -- NEW dedicated fields (should have data)
    home_course_id as new_home_course_id_column,
    home_course_name as new_home_course_name_column,
    society_id as new_society_id_column,
    society_name as new_society_name_column,
    member_since,

    -- JSONB data paths
    profile_data->'golfInfo'->>'homeClub' as jsonb_golf_homeclub,
    profile_data->'golfInfo'->>'homeCourseId' as jsonb_golf_homecourseid,
    profile_data->'golfInfo'->>'handicap' as jsonb_golf_handicap,

    profile_data->'organizationInfo'->>'societyName' as jsonb_org_societyname,
    profile_data->'organizationInfo'->>'societyId' as jsonb_org_societyid,
    profile_data->'organizationInfo'->>'clubAffiliation' as jsonb_org_clubaffiliation,

    -- Full JSONB columns (to see structure)
    profile_data->'golfInfo' as full_golfinfo_jsonb,
    profile_data->'organizationInfo' as full_organizationinfo_jsonb,
    profile_data->'personalInfo' as full_personalinfo_jsonb,

    created_at,
    updated_at
FROM user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- =====================================================================
-- TRUTH CHECK: Where is the data?
-- =====================================================================

SELECT
    '=== DATA LOCATION CHECK ===' as section,
    CASE
        WHEN home_course_name IS NOT NULL THEN '✅ Data in home_course_name column'
        ELSE '❌ home_course_name column is NULL'
    END as home_course_column_status,

    CASE
        WHEN profile_data->'golfInfo'->>'homeClub' IS NOT NULL THEN '✅ Data in profile_data.golfInfo.homeClub'
        ELSE '❌ profile_data.golfInfo.homeClub is NULL'
    END as home_course_jsonb_status,

    CASE
        WHEN home_club IS NOT NULL THEN '✅ Data in old home_club column'
        ELSE '❌ old home_club column is NULL'
    END as old_home_club_status,

    CASE
        WHEN society_name IS NOT NULL THEN '✅ Data in society_name column'
        ELSE '❌ society_name column is NULL'
    END as society_column_status,

    CASE
        WHEN profile_data->'organizationInfo'->>'societyName' IS NOT NULL THEN '✅ Data in profile_data.organizationInfo.societyName'
        ELSE '❌ profile_data.organizationInfo.societyName is NULL'
    END as society_jsonb_status

FROM user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- =====================================================================
-- WHAT DOES THE UI NEED?
-- =====================================================================
-- The UI reads from AppState.currentUser which comes from getUserProfile()
-- getUserProfile() populates profile_data.golfInfo.homeClub from columns
-- So we need EITHER:
-- 1. home_course_name column to have data, OR
-- 2. home_club column to have data, OR
-- 3. profile_data.golfInfo.homeClub to already have data
-- =====================================================================

SELECT
    '=== UI DATA AVAILABILITY ===' as section,
    CASE
        WHEN (home_course_name IS NOT NULL OR home_club IS NOT NULL OR profile_data->'golfInfo'->>'homeClub' IS NOT NULL)
        THEN '✅ UI SHOULD SEE HOME COURSE'
        ELSE '❌ UI WILL NOT SEE HOME COURSE - ALL SOURCES ARE NULL'
    END as ui_home_course_status,

    COALESCE(
        home_course_name,
        home_club,
        profile_data->'golfInfo'->>'homeClub',
        'NULL - NO DATA ANYWHERE'
    ) as home_course_value_ui_will_get,

    CASE
        WHEN (society_name IS NOT NULL OR profile_data->'organizationInfo'->>'societyName' IS NOT NULL)
        THEN '✅ UI SHOULD SEE SOCIETY'
        ELSE '❌ UI WILL NOT SEE SOCIETY - ALL SOURCES ARE NULL'
    END as ui_society_status,

    COALESCE(
        society_name,
        profile_data->'organizationInfo'->>'societyName',
        'NULL - NO DATA ANYWHERE'
    ) as society_value_ui_will_get

FROM user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- =====================================================================
-- RECOMMENDATION
-- =====================================================================

SELECT
    '=== NEXT STEPS ===' as section,
    CASE
        WHEN home_course_name IS NULL AND profile_data->'golfInfo'->>'homeClub' IS NOT NULL
        THEN '🔧 Run RESTORE_HOME_COURSE_FROM_JSONB.sql to copy data from JSONB to columns'

        WHEN home_course_name IS NULL AND home_club IS NOT NULL
        THEN '🔧 Run RESTORE_HOME_COURSE_FROM_JSONB.sql to copy from old home_club to new home_course_name'

        WHEN home_course_name IS NOT NULL
        THEN '✅ home_course_name column has data - issue might be in UI code'

        ELSE '❌ NO DATA EXISTS ANYWHERE - need to manually enter home course'
    END as recommendation

FROM user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';
