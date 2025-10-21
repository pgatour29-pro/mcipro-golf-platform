-- =====================================================
-- PROFILE DATA COMPLETENESS AUDIT
-- Purpose: Identify why profiles are not 100% complete
-- =====================================================

-- First, let's see the ACTUAL structure of user_profiles table
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- =====================================================
-- DATA COMPLETENESS BY FIELD (ALL USERS)
-- =====================================================

SELECT
    COUNT(*) as total_profiles,

    -- Primary identification fields
    COUNT(line_user_id) as has_line_user_id,
    ROUND(COUNT(line_user_id) * 100.0 / COUNT(*), 2) as pct_line_user_id,

    COUNT(name) as has_name,
    ROUND(COUNT(name) * 100.0 / COUNT(*), 2) as pct_name,

    COUNT(role) as has_role,
    ROUND(COUNT(role) * 100.0 / COUNT(*), 2) as pct_role,

    -- Contact fields
    COUNT(phone) as has_phone,
    ROUND(COUNT(phone) * 100.0 / COUNT(*), 2) as pct_phone,

    COUNT(email) as has_email,
    ROUND(COUNT(email) * 100.0 / COUNT(*), 2) as pct_email,

    -- Caddy-specific fields
    COUNT(caddy_number) as has_caddy_number,
    ROUND(COUNT(caddy_number) * 100.0 / COUNT(*), 2) as pct_caddy_number,

    -- Golf-specific fields (old schema)
    COUNT(home_club) as has_home_club_old,
    ROUND(COUNT(home_club) * 100.0 / COUNT(*), 2) as pct_home_club_old,

    -- Society affiliation fields (added later)
    COUNT(society_id) as has_society_id,
    ROUND(COUNT(society_id) * 100.0 / COUNT(*), 2) as pct_society_id,

    COUNT(society_name) as has_society_name,
    ROUND(COUNT(society_name) * 100.0 / COUNT(*), 2) as pct_society_name,

    COUNT(member_since) as has_member_since,
    ROUND(COUNT(member_since) * 100.0 / COUNT(*), 2) as pct_member_since,

    -- Home course fields (added later)
    COUNT(home_course_id) as has_home_course_id,
    ROUND(COUNT(home_course_id) * 100.0 / COUNT(*), 2) as pct_home_course_id,

    COUNT(home_course_name) as has_home_course_name,
    ROUND(COUNT(home_course_name) * 100.0 / COUNT(*), 2) as pct_home_course_name,

    -- JSONB profile_data field (comprehensive profile data)
    COUNT(profile_data) as has_profile_data,
    ROUND(COUNT(profile_data) * 100.0 / COUNT(*), 2) as pct_profile_data,

    -- Check if profile_data is populated (not just empty {})
    COUNT(CASE WHEN profile_data IS NOT NULL AND profile_data::text != '{}'::text THEN 1 END) as has_populated_profile_data,
    ROUND(COUNT(CASE WHEN profile_data IS NOT NULL AND profile_data::text != '{}'::text THEN 1 END) * 100.0 / COUNT(*), 2) as pct_populated_profile_data,

    -- Settings
    COUNT(language) as has_language,
    ROUND(COUNT(language) * 100.0 / COUNT(*), 2) as pct_language

FROM user_profiles;

-- =====================================================
-- DATA COMPLETENESS BY ROLE
-- =====================================================

SELECT
    role,
    COUNT(*) as total,

    -- Essential fields
    COUNT(name) as has_name,
    ROUND(COUNT(name) * 100.0 / COUNT(*), 2) as pct_name,

    COUNT(phone) as has_phone,
    ROUND(COUNT(phone) * 100.0 / COUNT(*), 2) as pct_phone,

    COUNT(email) as has_email,
    ROUND(COUNT(email) * 100.0 / COUNT(*), 2) as pct_email,

    -- Role-specific: Caddy
    COUNT(CASE WHEN role = 'caddie' AND caddy_number IS NOT NULL THEN 1 END) as caddies_with_number,

    -- Role-specific: Golfer
    COUNT(CASE WHEN role = 'golfer' AND (home_course_id IS NOT NULL OR home_course_name IS NOT NULL OR home_club IS NOT NULL) THEN 1 END) as golfers_with_home_course,

    COUNT(CASE WHEN role = 'golfer' AND (society_id IS NOT NULL OR society_name IS NOT NULL) THEN 1 END) as golfers_with_society,

    -- JSONB profile data
    COUNT(CASE WHEN profile_data IS NOT NULL AND profile_data::text != '{}'::text THEN 1 END) as has_rich_profile,
    ROUND(COUNT(CASE WHEN profile_data IS NOT NULL AND profile_data::text != '{}'::text THEN 1 END) * 100.0 / COUNT(*), 2) as pct_rich_profile

FROM user_profiles
GROUP BY role
ORDER BY total DESC;

-- =====================================================
-- PROFILE_DATA JSONB FIELD COMPLETENESS
-- Check what's inside the profile_data JSONB field
-- =====================================================

SELECT
    role,
    COUNT(*) as total,

    -- PersonalInfo fields
    COUNT(CASE WHEN profile_data->'personalInfo' IS NOT NULL AND profile_data->'personalInfo' != 'null'::jsonb THEN 1 END) as has_personalInfo,
    COUNT(CASE WHEN profile_data->'personalInfo'->>'firstName' IS NOT NULL THEN 1 END) as has_firstName,
    COUNT(CASE WHEN profile_data->'personalInfo'->>'lastName' IS NOT NULL THEN 1 END) as has_lastName,
    COUNT(CASE WHEN profile_data->'personalInfo'->>'username' IS NOT NULL THEN 1 END) as has_username,
    COUNT(CASE WHEN profile_data->'personalInfo'->>'phone' IS NOT NULL THEN 1 END) as has_personalInfo_phone,
    COUNT(CASE WHEN profile_data->'personalInfo'->>'email' IS NOT NULL THEN 1 END) as has_personalInfo_email,

    -- GolfInfo fields
    COUNT(CASE WHEN profile_data->'golfInfo' IS NOT NULL AND profile_data->'golfInfo' != 'null'::jsonb THEN 1 END) as has_golfInfo,
    COUNT(CASE WHEN profile_data->'golfInfo'->>'handicap' IS NOT NULL THEN 1 END) as has_handicap,
    COUNT(CASE WHEN profile_data->'golfInfo'->>'homeClub' IS NOT NULL THEN 1 END) as has_golfInfo_homeClub,
    COUNT(CASE WHEN profile_data->'golfInfo'->>'homeCourseId' IS NOT NULL THEN 1 END) as has_golfInfo_homeCourseId,
    COUNT(CASE WHEN profile_data->'golfInfo'->>'experienceLevel' IS NOT NULL THEN 1 END) as has_experienceLevel,
    COUNT(CASE WHEN profile_data->'golfInfo'->>'playingStyle' IS NOT NULL THEN 1 END) as has_playingStyle,

    -- OrganizationInfo fields (for society organizers)
    COUNT(CASE WHEN profile_data->'organizationInfo' IS NOT NULL AND profile_data->'organizationInfo' != 'null'::jsonb THEN 1 END) as has_organizationInfo,
    COUNT(CASE WHEN profile_data->'organizationInfo'->>'societyName' IS NOT NULL THEN 1 END) as has_organizationInfo_societyName,
    COUNT(CASE WHEN profile_data->'organizationInfo'->>'societyId' IS NOT NULL THEN 1 END) as has_organizationInfo_societyId,

    -- ProfessionalInfo fields (for caddies/managers)
    COUNT(CASE WHEN profile_data->'professionalInfo' IS NOT NULL AND profile_data->'professionalInfo' != 'null'::jsonb THEN 1 END) as has_professionalInfo,

    -- Skills fields
    COUNT(CASE WHEN profile_data->'skills' IS NOT NULL AND profile_data->'skills' != 'null'::jsonb THEN 1 END) as has_skills,

    -- Preferences fields
    COUNT(CASE WHEN profile_data->'preferences' IS NOT NULL AND profile_data->'preferences' != 'null'::jsonb THEN 1 END) as has_preferences,

    -- Media fields
    COUNT(CASE WHEN profile_data->'media' IS NOT NULL AND profile_data->'media' != 'null'::jsonb THEN 1 END) as has_media,
    COUNT(CASE WHEN profile_data->'media'->>'profilePhoto' IS NOT NULL THEN 1 END) as has_profilePhoto,

    -- Privacy fields
    COUNT(CASE WHEN profile_data->'privacy' IS NOT NULL AND profile_data->'privacy' != 'null'::jsonb THEN 1 END) as has_privacy

FROM user_profiles
GROUP BY role
ORDER BY total DESC;

-- =====================================================
-- IDENTIFY INCOMPLETE PROFILES
-- Profiles with missing critical data
-- =====================================================

SELECT
    line_user_id,
    name,
    role,

    -- Missing fields indicators
    CASE WHEN phone IS NULL OR phone = '' THEN '❌' ELSE '✅' END as has_phone,
    CASE WHEN email IS NULL OR email = '' THEN '❌' ELSE '✅' END as has_email,
    CASE WHEN role = 'caddie' AND (caddy_number IS NULL OR caddy_number = '') THEN '❌' ELSE '✅' END as has_caddy_number,
    CASE WHEN role = 'golfer' AND (home_course_id IS NULL OR home_course_id = '') AND (home_course_name IS NULL OR home_course_name = '') AND (home_club IS NULL OR home_club = '') THEN '❌' ELSE '✅' END as has_home_course,
    CASE WHEN profile_data IS NULL OR profile_data::text = '{}' THEN '❌' ELSE '✅' END as has_rich_data,

    created_at,
    updated_at

FROM user_profiles
WHERE
    -- Missing any critical field
    (phone IS NULL OR phone = '')
    OR (email IS NULL OR email = '')
    OR (role = 'caddie' AND (caddy_number IS NULL OR caddy_number = ''))
    OR (role = 'golfer' AND (home_course_id IS NULL OR home_course_id = '') AND (home_course_name IS NULL OR home_course_name = '') AND (home_club IS NULL OR home_club = ''))
    OR (profile_data IS NULL OR profile_data::text = '{}')
ORDER BY created_at DESC;

-- =====================================================
-- EXAMPLE PROFILE DATA STRUCTURE
-- Show what a complete profile looks like
-- =====================================================

SELECT
    line_user_id,
    name,
    role,
    profile_data
FROM user_profiles
WHERE profile_data IS NOT NULL
  AND profile_data::text != '{}'
  AND jsonb_typeof(profile_data->'golfInfo') = 'object'
LIMIT 1;

-- =====================================================
-- SUMMARY: REQUIRED FIELDS BY ROLE
-- =====================================================

-- This is what SHOULD be 100% populated for each role:

/*
GOLFER ROLE:
  REQUIRED (100%):
    - line_user_id (PRIMARY KEY)
    - name
    - role = 'golfer'
    - profile_data.personalInfo.firstName
    - profile_data.personalInfo.lastName
    - profile_data.personalInfo.username
    - profile_data.golfInfo.handicap

  HIGHLY RECOMMENDED (should be 90%+):
    - phone
    - email
    - home_course_id OR home_course_name OR profile_data.golfInfo.homeClub
    - society_id OR society_name OR profile_data.organizationInfo.societyName
    - profile_data.golfInfo.experienceLevel
    - profile_data.preferences (preferences object)

CADDIE ROLE:
  REQUIRED (100%):
    - line_user_id (PRIMARY KEY)
    - name
    - role = 'caddie'
    - caddy_number (MUST be populated for caddies)
    - home_club OR home_course_name (which golf course they work at)
    - profile_data.professionalInfo.experience

  HIGHLY RECOMMENDED:
    - phone
    - email
    - profile_data.professionalInfo.specialty
    - profile_data.skills.languages (array)

SOCIETY_ORGANIZER ROLE:
  REQUIRED (100%):
    - line_user_id (PRIMARY KEY)
    - name
    - role = 'society_organizer'
    - society_id
    - society_name OR profile_data.organizationInfo.societyName
    - profile_data.organizationInfo.organizerName

  HIGHLY RECOMMENDED:
    - phone
    - email
    - profile_data.organizationInfo.memberCount
    - profile_data.organizationInfo.establishedDate

MANAGER ROLE:
  REQUIRED (100%):
    - line_user_id (PRIMARY KEY)
    - name
    - role = 'manager'
    - profile_data.professionalInfo.department

  HIGHLY RECOMMENDED:
    - phone
    - email
    - profile_data.professionalInfo.managementExperience

PROSHOP ROLE:
  REQUIRED (100%):
    - line_user_id (PRIMARY KEY)
    - name
    - role = 'proshop'

  HIGHLY RECOMMENDED:
    - phone
    - email
*/

-- =====================================================
-- DIAGNOSTIC: WHY ARE FIELDS MISSING?
-- =====================================================

-- Check when profiles were created vs when migrations were run
SELECT
    DATE(created_at) as creation_date,
    COUNT(*) as profiles_created,

    -- Check if they have new fields
    COUNT(CASE WHEN home_course_id IS NOT NULL THEN 1 END) as has_new_home_course_id,
    COUNT(CASE WHEN society_id IS NOT NULL THEN 1 END) as has_new_society_id,
    COUNT(CASE WHEN profile_data IS NOT NULL AND profile_data::text != '{}' THEN 1 END) as has_jsonb_data

FROM user_profiles
GROUP BY DATE(created_at)
ORDER BY creation_date DESC;

-- =====================================================
-- RECOMMENDED SQL TO ACHIEVE 100% COMPLETENESS
-- =====================================================

-- This section will be generated after seeing the results above
SELECT '===== AUDIT COMPLETE =====' as status;
