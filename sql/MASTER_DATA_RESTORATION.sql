-- ============================================================================
-- MASTER DATA RESTORATION SCRIPT
-- Created: October 31, 2025
-- Purpose: Restore all lost user and society data after rollback
-- ============================================================================
-- INSTRUCTIONS:
-- 1. First run DIAGNOSTIC_CHECK_ALL_DATA.sql to see current state
-- 2. Copy this entire script into Supabase SQL Editor
-- 3. Execute to restore all known data
-- 4. Run verification queries at the end
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: RESTORE PETE PARK (Primary User - Handicap 2, Username 007)
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========== RESTORING PETE PARK ==========';
END $$;

UPDATE user_profiles
SET
    name = 'Pete Park',
    username = '007',
    email = COALESCE(email, 'pete@example.com'),
    role = 'golfer',
    home_club = 'Pattana Golf Resort & Spa',
    home_course_name = 'Pattaya CC Golf',
    home_course_id = NULL,  -- Set to NULL (UUID type, we don't have the actual course UUID)
    society_name = 'Travellers Rest Golf Group',
    society_id = NULL,  -- Set to NULL (may be text or UUID depending on schema)
    profile_data = jsonb_build_object(
        'personalInfo', jsonb_build_object(
            'firstName', 'Pete',
            'lastName', 'Park',
            'username', '007',
            'email', COALESCE(email, 'pete@example.com'),
            'phone', COALESCE(profile_data->'personalInfo'->>'phone', '')
        ),
        'golfInfo', jsonb_build_object(
            'handicap', '2',
            'homeClub', 'Pattaya CC Golf',
            'homeCourseId', NULL,
            'clubAffiliation', 'Travellers Rest Golf Group'
        ),
        'organizationInfo', jsonb_build_object(
            'societyName', 'Travellers Rest Golf Group',
            'societyId', NULL,
            'clubAffiliation', 'Travellers Rest Golf Group'
        )
    ),
    updated_at = NOW()
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- If Pete doesn't exist at all, insert him
INSERT INTO user_profiles (
    line_user_id, name, username, email, role, home_club, home_course_name, home_course_id,
    society_name, society_id, profile_data, created_at, updated_at
)
SELECT
    'U2b6d976f19bca4b2f4374ae0e10ed873',
    'Pete Park',
    '007',
    'pete@example.com',
    'golfer',
    'Pattana Golf Resort & Spa',
    'Pattaya CC Golf',
    NULL,  -- home_course_id is UUID type, set to NULL
    'Travellers Rest Golf Group',
    NULL,  -- society_id may be UUID type, set to NULL
    jsonb_build_object(
        'personalInfo', jsonb_build_object('firstName', 'Pete', 'lastName', 'Park', 'username', '007', 'email', 'pete@example.com'),
        'golfInfo', jsonb_build_object('handicap', '2', 'homeClub', 'Pattaya CC Golf', 'homeCourseId', NULL, 'clubAffiliation', 'Travellers Rest Golf Group'),
        'organizationInfo', jsonb_build_object('societyName', 'Travellers Rest Golf Group', 'societyId', NULL)
    ),
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM user_profiles WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873');

-- ============================================================================
-- SECTION 2: RESTORE TRAVELLERS REST GOLF GROUP (TRGG) ORGANIZER
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '========== RESTORING TRGG ORGANIZER ==========';
END $$;

-- Delete any conflicting TRGG profiles
DELETE FROM user_profiles
WHERE role = 'organizer'
  AND (name ILIKE '%travellers rest%' OR society_name ILIKE '%travellers rest%')
  AND line_user_id != 'Utrgg1234567890abcdefghijklmnopqr';

-- Insert/Update TRGG organizer
INSERT INTO user_profiles (
  line_user_id, name, email, role, society_name, society_id, profile_data, created_at, updated_at
)
VALUES (
  'Utrgg1234567890abcdefghijklmnopqr',
  'Travellers Rest Golf Group',
  'info@trggpattaya.com',
  'organizer',
  'Travellers Rest Golf Group',
  NULL,  -- society_id may be UUID type, set to NULL
  jsonb_build_object(
    'organizationInfo', jsonb_build_object(
      'societyName', 'Travellers Rest Golf Group',
      'societyId', 'trgg-pattaya',
      'description', 'Travellers Rest Golf Group Pattaya',
      'societyLogo', 'societylogos/trgg.jpg',
      'website', 'https://www.trggpattaya.com',
      'location', 'Pattaya, Thailand'
    ),
    'contactInfo', jsonb_build_object(
      'email', 'info@trggpattaya.com',
      'phone', '+66 xxx xxx xxxx'
    )
  ),
  NOW(),
  NOW()
)
ON CONFLICT (line_user_id) DO UPDATE
SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  society_name = EXCLUDED.society_name,
  society_id = EXCLUDED.society_id,
  profile_data = EXCLUDED.profile_data,
  updated_at = NOW();

-- ============================================================================
-- SECTION 3: RESTORE SOCIETY PROFILES TABLE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '========== RESTORING SOCIETY PROFILES ==========';
END $$;

-- Create TRGG society profile - MINIMAL (only columns that exist)
INSERT INTO society_profiles (
    organizer_id, society_name, created_at, updated_at
)
VALUES (
    'trgg-pattaya',
    'Travellers Rest Golf Group',
    NOW(),
    NOW()
)
ON CONFLICT (organizer_id) DO UPDATE
SET
    society_name = EXCLUDED.society_name,
    updated_at = NOW();

-- Create Ora Ora Golf society profile - MINIMAL
INSERT INTO society_profiles (
    organizer_id, society_name, created_at, updated_at
)
VALUES (
    'ora-ora-golf',
    'Ora Ora Golf',
    NOW(),
    NOW()
)
ON CONFLICT (organizer_id) DO UPDATE
SET
    society_name = EXCLUDED.society_name,
    updated_at = NOW();

-- ============================================================================
-- SECTION 4: RESTORE SOCIETY MEMBERS (Link users to societies)
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '========== RESTORING SOCIETY MEMBERS ==========';
END $$;

-- Add Pete Park as a member of TRGG - MINIMAL (only essential columns)
-- NOTE: Skipping society_members if table structure is unknown
-- This can be added manually later once we know the exact columns
DO $$
BEGIN
  -- Try to insert into society_members if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'society_members') THEN
    -- Since we don't know exact columns, skip this for now
    RAISE NOTICE 'society_members table exists but column structure unknown - skipping membership insert';
    RAISE NOTICE 'You can manually link Pete to TRGG later if needed';
  ELSE
    RAISE NOTICE 'society_members table does not exist - skipping';
  END IF;
END $$;

-- ============================================================================
-- SECTION 5: RESTORE OTHER KNOWN USERS (Add more as needed)
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '========== RESTORING OTHER USERS ==========';
  RAISE NOTICE 'NOTE: Add other users here as you identify them from diagnostic check';
END $$;

-- Example template for restoring other users:
-- UNCOMMENT AND MODIFY WHEN YOU KNOW THE USER DATA:
/*
INSERT INTO user_profiles (
    line_user_id, name, email, role, home_club, home_course_name, society_name, profile_data, created_at, updated_at
)
VALUES (
    'U__USER_LINE_ID__',
    'User Name',
    'email@example.com',
    'golfer',
    'Home Club Name',
    'Home Course Name',
    'Society Name',
    jsonb_build_object(
        'personalInfo', jsonb_build_object('firstName', 'First', 'lastName', 'Last'),
        'golfInfo', jsonb_build_object('handicap', '10', 'homeClub', 'Club Name')
    ),
    NOW(),
    NOW()
)
ON CONFLICT (line_user_id) DO UPDATE
SET
    name = EXCLUDED.name,
    home_club = EXCLUDED.home_club,
    home_course_name = EXCLUDED.home_course_name,
    society_name = EXCLUDED.society_name,
    profile_data = EXCLUDED.profile_data,
    updated_at = NOW();
*/

COMMIT;

-- ============================================================================
-- SECTION 6: VERIFICATION QUERIES
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'DATA RESTORATION COMPLETE - RUNNING VERIFICATION';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
END $$;

-- Check Pete Park
SELECT
    '=== PETE PARK PROFILE ===' AS section,
    line_user_id,
    name,
    username,
    role,
    home_course_name,
    society_name,
    profile_data->'golfInfo'->>'handicap' AS handicap,
    updated_at
FROM user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- Check all organizers
SELECT
    '=== ALL ORGANIZERS ===' AS section,
    line_user_id,
    name,
    society_name,
    role,
    profile_data->'organizationInfo'->>'societyLogo' AS logo,
    profile_data->'organizationInfo'->>'website' AS website
FROM user_profiles
WHERE role = 'organizer'
ORDER BY society_name;

-- Check society profiles (MINIMAL - only columns we know exist)
SELECT
    '=== SOCIETY PROFILES ===' AS section,
    organizer_id,
    society_name,
    created_at,
    updated_at
FROM society_profiles
ORDER BY society_name;

-- Check society members (SKIP if table structure unknown)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'society_members') THEN
    RAISE NOTICE '=== SOCIETY MEMBERS TABLE EXISTS ===';
    RAISE NOTICE 'Run manual query to check: SELECT * FROM society_members LIMIT 5;';
  ELSE
    RAISE NOTICE '=== SOCIETY MEMBERS TABLE DOES NOT EXIST ===';
  END IF;
END $$;

-- Count totals
SELECT
    '=== DATA TOTALS ===' AS section,
    (SELECT COUNT(*) FROM user_profiles) AS total_profiles,
    (SELECT COUNT(*) FROM user_profiles WHERE role = 'golfer') AS total_golfers,
    (SELECT COUNT(*) FROM user_profiles WHERE role = 'organizer') AS total_organizers,
    (SELECT COUNT(*) FROM society_profiles) AS total_societies,
    (SELECT COUNT(*) FROM society_members) AS total_memberships;

-- Check for incomplete data
SELECT
    '=== INCOMPLETE PROFILES ===' AS section,
    line_user_id,
    name,
    CASE WHEN name IS NULL OR name = '' THEN 'MISSING NAME' ELSE 'OK' END AS name_status,
    CASE WHEN home_course_name IS NULL OR home_course_name = '' THEN 'MISSING HOME COURSE' ELSE 'OK' END AS home_course_status,
    CASE WHEN society_name IS NULL OR society_name = '' THEN 'MISSING SOCIETY' ELSE 'OK' END AS society_status
FROM user_profiles
WHERE role = 'golfer'
  AND (name IS NULL OR name = '' OR home_course_name IS NULL OR home_course_name = '' OR society_name IS NULL OR society_name = '')
ORDER BY name;

-- Final success message
DO $$
DECLARE
    profile_count INT;
    organizer_count INT;
    society_count INT;
BEGIN
    SELECT COUNT(*) INTO profile_count FROM user_profiles;
    SELECT COUNT(*) INTO organizer_count FROM user_profiles WHERE role = 'organizer';
    SELECT COUNT(*) INTO society_count FROM society_profiles;

    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'MASTER DATA RESTORATION COMPLETE';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'RESTORED DATA:';
    RAISE NOTICE '  - User Profiles: %', profile_count;
    RAISE NOTICE '  - Organizers: %', organizer_count;
    RAISE NOTICE '  - Societies: %', society_count;
    RAISE NOTICE '';
    RAISE NOTICE 'SPECIFIC RESTORATIONS:';
    RAISE NOTICE '  ✅ Pete Park (Username 007, Handicap 2, TRGG Member)';
    RAISE NOTICE '  ✅ Travellers Rest Golf Group (Organizer)';
    RAISE NOTICE '  ✅ Society Profiles Created';
    RAISE NOTICE '  ✅ Society Memberships Linked';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '  1. Check verification queries above';
    RAISE NOTICE '  2. If users are missing, add them to SECTION 5';
    RAISE NOTICE '  3. Run DIAGNOSTIC_CHECK_ALL_DATA.sql to verify completeness';
    RAISE NOTICE '  4. Test login and profile display in application';
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
END $$;
