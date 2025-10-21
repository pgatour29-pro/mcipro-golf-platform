-- =====================================================
-- BACKFILL MISSING PROFILE DATA
-- Purpose: Migrate existing profiles to 100% completeness
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Migrate JSONB data to flat columns
-- =====================================================

-- Backfill home_course_name from JSONB
UPDATE user_profiles
SET home_course_name = profile_data->'golfInfo'->>'homeClub'
WHERE (home_course_name IS NULL OR home_course_name = '')
  AND profile_data->'golfInfo'->>'homeClub' IS NOT NULL
  AND profile_data->'golfInfo'->>'homeClub' != '';

-- Backfill home_course_id from JSONB
UPDATE user_profiles
SET home_course_id = profile_data->'golfInfo'->>'homeCourseId'
WHERE (home_course_id IS NULL OR home_course_id = '')
  AND profile_data->'golfInfo'->>'homeCourseId' IS NOT NULL
  AND profile_data->'golfInfo'->>'homeCourseId' != '';

-- Backfill society_name from JSONB
UPDATE user_profiles
SET society_name = profile_data->'organizationInfo'->>'societyName'
WHERE (society_name IS NULL OR society_name = '')
  AND profile_data->'organizationInfo'->>'societyName' IS NOT NULL
  AND profile_data->'organizationInfo'->>'societyName' != '';

-- Backfill phone from JSONB if missing
UPDATE user_profiles
SET phone = profile_data->'personalInfo'->>'phone'
WHERE (phone IS NULL OR phone = '')
  AND profile_data->'personalInfo'->>'phone' IS NOT NULL
  AND profile_data->'personalInfo'->>'phone' != '';

-- Backfill email from JSONB if missing
UPDATE user_profiles
SET email = profile_data->'personalInfo'->>'email'
WHERE (email IS NULL OR email = '')
  AND profile_data->'personalInfo'->>'email' IS NOT NULL
  AND profile_data->'personalInfo'->>'email' != '';

-- =====================================================
-- STEP 2: Initialize empty JSONB sections
-- =====================================================

-- Ensure all profiles have profile_data object
UPDATE user_profiles
SET profile_data = '{}'::jsonb
WHERE profile_data IS NULL;

-- Initialize personalInfo section
UPDATE user_profiles
SET profile_data = jsonb_set(
    profile_data,
    '{personalInfo}',
    COALESCE(profile_data->'personalInfo', '{}'::jsonb)
)
WHERE profile_data->'personalInfo' IS NULL;

-- Initialize golfInfo section
UPDATE user_profiles
SET profile_data = jsonb_set(
    profile_data,
    '{golfInfo}',
    COALESCE(profile_data->'golfInfo', '{}'::jsonb)
)
WHERE profile_data->'golfInfo' IS NULL;

-- Initialize professionalInfo section
UPDATE user_profiles
SET profile_data = jsonb_set(
    profile_data,
    '{professionalInfo}',
    COALESCE(profile_data->'professionalInfo', '{}'::jsonb)
)
WHERE profile_data->'professionalInfo' IS NULL;

-- Initialize organizationInfo section
UPDATE user_profiles
SET profile_data = jsonb_set(
    profile_data,
    '{organizationInfo}',
    COALESCE(profile_data->'organizationInfo', '{}'::jsonb)
)
WHERE profile_data->'organizationInfo' IS NULL;

-- Initialize skills section
UPDATE user_profiles
SET profile_data = jsonb_set(
    profile_data,
    '{skills}',
    COALESCE(profile_data->'skills', '{}'::jsonb)
)
WHERE profile_data->'skills' IS NULL;

-- Initialize preferences section
UPDATE user_profiles
SET profile_data = jsonb_set(
    profile_data,
    '{preferences}',
    COALESCE(profile_data->'preferences', '{}'::jsonb)
)
WHERE profile_data->'preferences' IS NULL;

-- Initialize media section
UPDATE user_profiles
SET profile_data = jsonb_set(
    profile_data,
    '{media}',
    COALESCE(profile_data->'media', '{}'::jsonb)
)
WHERE profile_data->'media' IS NULL;

-- Initialize privacy section
UPDATE user_profiles
SET profile_data = jsonb_set(
    profile_data,
    '{privacy}',
    COALESCE(profile_data->'privacy', '{}'::jsonb)
)
WHERE profile_data->'privacy' IS NULL;

-- =====================================================
-- STEP 3: Populate required fields with defaults
-- =====================================================

-- Set default handicap for golfers if missing
UPDATE user_profiles
SET profile_data = jsonb_set(
    profile_data,
    '{golfInfo,handicap}',
    '0'::jsonb
)
WHERE role = 'golfer'
  AND (profile_data->'golfInfo'->>'handicap' IS NULL
       OR profile_data->'golfInfo'->>'handicap' = ''
       OR profile_data->'golfInfo'->>'handicap' = 'null');

-- Sync homeClub from flat columns to JSONB
UPDATE user_profiles
SET profile_data = jsonb_set(
    profile_data,
    '{golfInfo,homeClub}',
    to_jsonb(COALESCE(home_course_name, home_club, ''))
)
WHERE (profile_data->'golfInfo'->>'homeClub' IS NULL OR profile_data->'golfInfo'->>'homeClub' = '')
  AND (home_course_name IS NOT NULL OR home_club IS NOT NULL);

-- Sync homeCourseId from flat columns to JSONB
UPDATE user_profiles
SET profile_data = jsonb_set(
    profile_data,
    '{golfInfo,homeCourseId}',
    to_jsonb(home_course_id)
)
WHERE (profile_data->'golfInfo'->>'homeCourseId' IS NULL OR profile_data->'golfInfo'->>'homeCourseId' = '')
  AND home_course_id IS NOT NULL;

-- Sync society from flat columns to JSONB
UPDATE user_profiles
SET profile_data = jsonb_set(
    profile_data,
    '{organizationInfo,societyName}',
    to_jsonb(society_name)
)
WHERE (profile_data->'organizationInfo'->>'societyName' IS NULL OR profile_data->'organizationInfo'->>'societyName' = '')
  AND society_name IS NOT NULL;

-- Set default language if missing
UPDATE user_profiles
SET language = 'en'
WHERE language IS NULL OR language = '';

-- Populate username from name if missing (make it URL-safe)
UPDATE user_profiles
SET profile_data = jsonb_set(
    profile_data,
    '{personalInfo,username}',
    to_jsonb(LOWER(REGEXP_REPLACE(REPLACE(name, ' ', '_'), '[^a-z0-9_]', '', 'g')))
)
WHERE (profile_data->'personalInfo'->>'username' IS NULL
       OR profile_data->'personalInfo'->>'username' = '')
  AND name IS NOT NULL;

-- Populate firstName/lastName from name if missing
UPDATE user_profiles
SET profile_data = jsonb_set(
    jsonb_set(
        profile_data,
        '{personalInfo,firstName}',
        to_jsonb(SPLIT_PART(name, ' ', 1))
    ),
    '{personalInfo,lastName}',
    to_jsonb(CASE WHEN POSITION(' ' IN name) > 0 THEN SUBSTRING(name FROM POSITION(' ' IN name) + 1) ELSE '' END)
)
WHERE (profile_data->'personalInfo'->>'firstName' IS NULL OR profile_data->'personalInfo'->>'firstName' = '')
  AND name IS NOT NULL;

-- Copy phone to personalInfo if missing
UPDATE user_profiles
SET profile_data = jsonb_set(
    profile_data,
    '{personalInfo,phone}',
    to_jsonb(phone)
)
WHERE (profile_data->'personalInfo'->>'phone' IS NULL OR profile_data->'personalInfo'->>'phone' = '')
  AND phone IS NOT NULL;

-- Copy email to personalInfo if missing
UPDATE user_profiles
SET profile_data = jsonb_set(
    profile_data,
    '{personalInfo,email}',
    to_jsonb(email)
)
WHERE (profile_data->'personalInfo'->>'email' IS NULL OR profile_data->'personalInfo'->>'email' = '')
  AND email IS NOT NULL;

-- Add userId to profile_data
UPDATE user_profiles
SET profile_data = jsonb_set(
    profile_data,
    '{userId}',
    to_jsonb(line_user_id)
)
WHERE profile_data->>'userId' IS NULL;

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT
    'BACKFILL COMPLETE!' as status,
    COUNT(*) as total_profiles,

    -- Essential fields
    COUNT(CASE WHEN name IS NOT NULL AND name != '' THEN 1 END) as has_name,
    ROUND(COUNT(CASE WHEN name IS NOT NULL AND name != '' THEN 1 END) * 100.0 / COUNT(*), 2) as pct_name,

    COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as has_phone,
    ROUND(COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) * 100.0 / COUNT(*), 2) as pct_phone,

    COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) as has_email,
    ROUND(COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) * 100.0 / COUNT(*), 2) as pct_email,

    -- Home course
    COUNT(CASE WHEN home_course_name IS NOT NULL OR home_course_id IS NOT NULL THEN 1 END) as has_home_course,
    ROUND(COUNT(CASE WHEN home_course_name IS NOT NULL OR home_course_id IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2) as pct_home_course,

    -- JSONB completeness
    COUNT(CASE WHEN profile_data IS NOT NULL AND profile_data::text != '{}' THEN 1 END) as has_profile_data,
    ROUND(COUNT(CASE WHEN profile_data IS NOT NULL AND profile_data::text != '{}' THEN 1 END) * 100.0 / COUNT(*), 2) as pct_profile_data,

    COUNT(CASE WHEN profile_data->'personalInfo' IS NOT NULL AND profile_data->'personalInfo' != 'null'::jsonb THEN 1 END) as has_personalInfo,
    ROUND(COUNT(CASE WHEN profile_data->'personalInfo' IS NOT NULL AND profile_data->'personalInfo' != 'null'::jsonb THEN 1 END) * 100.0 / COUNT(*), 2) as pct_personalInfo,

    COUNT(CASE WHEN profile_data->'golfInfo' IS NOT NULL AND profile_data->'golfInfo' != 'null'::jsonb THEN 1 END) as has_golfInfo,
    ROUND(COUNT(CASE WHEN profile_data->'golfInfo' IS NOT NULL AND profile_data->'golfInfo' != 'null'::jsonb THEN 1 END) * 100.0 / COUNT(*), 2) as pct_golfInfo

FROM user_profiles;

-- Show any remaining incomplete profiles
SELECT
    'REMAINING INCOMPLETE PROFILES' as note,
    line_user_id,
    name,
    role,
    CASE WHEN phone IS NULL OR phone = '' THEN '❌ Missing phone' ELSE '✅' END as phone_status,
    CASE WHEN email IS NULL OR email = '' THEN '❌ Missing email' ELSE '✅' END as email_status,
    CASE WHEN profile_data IS NULL OR profile_data::text = '{}' THEN '❌ Empty profile_data' ELSE '✅' END as jsonb_status,
    created_at
FROM user_profiles
WHERE (phone IS NULL OR phone = '')
   OR (email IS NULL OR email = '')
   OR (profile_data IS NULL OR profile_data::text = '{}')
ORDER BY created_at DESC;
