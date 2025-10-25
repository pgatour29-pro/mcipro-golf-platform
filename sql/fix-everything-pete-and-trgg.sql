-- =====================================================================
-- FIX EVERYTHING: Pete Park Profile + TRGG Organizer
-- =====================================================================
-- This fixes BOTH issues in one SQL script:
-- 1. Pete Park: golfer with username 007
-- 2. TRGG: organizer (separate profile, different LINE ID)
-- =====================================================================

BEGIN;

-- =====================================================================
-- STEP 1: FIX PETE PARK PROFILE (Golfer, Username 007)
-- =====================================================================

-- Update Pete Park's profile with correct data
UPDATE user_profiles
SET
    name = 'Pete Park',
    username = '007',
    email = COALESCE(email, 'pete@example.com'),
    role = 'golfer',
    home_club = 'Pattana Golf Resort & Spa',
    home_course_name = 'Pattaya CC Golf',
    society_name = 'Travellers Rest Golf Group',
    profile_data = jsonb_build_object(
        'personalInfo', jsonb_build_object(
            'firstName', 'Pete',
            'lastName', 'Park',
            'email', COALESCE(email, 'pete@example.com'),
            'phone', COALESCE(profile_data->'personalInfo'->>'phone', '')
        ),
        'golfInfo', jsonb_build_object(
            'handicap', '2',
            'homeClub', 'Pattaya CC Golf',
            'clubAffiliation', 'Travellers Rest Golf Group'
        )
    ),
    updated_at = NOW()
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- =====================================================================
-- STEP 2: DELETE ANY CONFLICTING TRGG PROFILES
-- =====================================================================

-- Delete any TRGG organizer profile that might be using Pete's LINE ID
DELETE FROM user_profiles
WHERE role = 'organizer'
  AND (name ILIKE '%travellers rest%' OR society_name ILIKE '%travellers rest%')
  AND line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- Delete any old TRGG profiles with different IDs
DELETE FROM user_profiles
WHERE role = 'organizer'
  AND (name ILIKE '%travellers rest%' OR society_name ILIKE '%travellers rest%')
  AND line_user_id != 'Utrgg1234567890abcdefghijklmnopqr';

-- =====================================================================
-- STEP 3: INSERT TRGG ORGANIZER (Separate Profile)
-- =====================================================================

INSERT INTO user_profiles (
  line_user_id,
  name,
  email,
  role,
  society_name,
  society_id,
  profile_data,
  created_at,
  updated_at
)
VALUES (
  'Utrgg1234567890abcdefghijklmnopqr',          -- TRGG's own organizer ID (NOT Pete's)
  'Travellers Rest Golf Group',                  -- Display name
  'info@trggpattaya.com',                        -- Email
  'organizer',                                    -- Role
  'Travellers Rest Golf Group',                  -- Society name
  NULL,                                           -- Society ID (set to NULL)
  jsonb_build_object(
    'organizationInfo', jsonb_build_object(
      'societyName', 'Travellers Rest Golf Group',
      'societyId', 'trgg-pattaya',
      'description', 'Travellers Rest Golf Group Pattaya',
      'societyLogo', 'societylogos/trgg.jpg',
      'website', 'https://www.trggpattaya.com'
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
  profile_data = EXCLUDED.profile_data,
  updated_at = NOW();

COMMIT;

-- =====================================================================
-- VERIFICATION
-- =====================================================================

-- Check Pete Park's profile
SELECT
    'PETE PARK' as profile_type,
    line_user_id,
    name,
    username,
    role,
    home_club,
    society_name
FROM user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- Check all organizers (should see 2: Ora Ora Golf + TRGG)
SELECT
    'ORGANIZERS' as profile_type,
    line_user_id,
    name,
    role,
    society_name,
    profile_data->'organizationInfo'->>'societyLogo' as logo
FROM user_profiles
WHERE role = 'organizer'
ORDER BY society_name;

-- Count organizers (should be 2)
SELECT
    'TOTAL ORGANIZERS' as label,
    COUNT(*) as count
FROM user_profiles
WHERE role = 'organizer';

-- Check all golfers
SELECT
    'GOLFERS' as profile_type,
    line_user_id,
    name,
    username,
    role
FROM user_profiles
WHERE role = 'golfer'
ORDER BY name;

-- =====================================================================
-- SUCCESS MESSAGE
-- =====================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'ALL FIXED - PETE PARK + TRGG ORGANIZER';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'PETE PARK (GOLFER):';
  RAISE NOTICE '  LINE ID: U2b6d976f19bca4b2f4374ae0e10ed873';
  RAISE NOTICE '  Name: Pete Park';
  RAISE NOTICE '  Username: 007';
  RAISE NOTICE '  Role: golfer';
  RAISE NOTICE '  Handicap: 1';
  RAISE NOTICE '  Home Club: Pattana Golf Resort & Spa';
  RAISE NOTICE '  Society Member: Travellers Rest Golf Group';
  RAISE NOTICE '';
  RAISE NOTICE 'TRGG (ORGANIZER):';
  RAISE NOTICE '  LINE ID: Utrgg1234567890abcdefghijklmnopqr';
  RAISE NOTICE '  Name: Travellers Rest Golf Group';
  RAISE NOTICE '  Role: organizer';
  RAISE NOTICE '  Website: https://www.trggpattaya.com';
  RAISE NOTICE '';
  RAISE NOTICE 'RESULT:';
  RAISE NOTICE '  - Pete Park is a golfer with username 007';
  RAISE NOTICE '  - TRGG is a separate organizer profile';
  RAISE NOTICE '  - Admin dashboard will show: Golf Societies: 2';
  RAISE NOTICE '  - Netflix modal will show: Ora Ora Golf + TRGG';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;
