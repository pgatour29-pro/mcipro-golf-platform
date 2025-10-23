-- =====================================================================
-- FIX PETE PARK PROFILE - Restore correct profile data
-- =====================================================================
-- LINE ID: U2b6d976f19bca4b2f4374ae0e10ed873
-- Username: 007
-- Name: Pete Park
-- =====================================================================

BEGIN;

-- Update Pete Park's profile with correct data
UPDATE user_profiles
SET
    name = 'Pete Park',
    username = '007',
    email = COALESCE(email, 'pete@example.com'),
    role = 'golfer',
    home_club = 'Pattana Golf Resort & Spa',
    home_course_name = 'Pattana Golf Club',
    society_name = 'Travellers Rest Golf Group',
    profile_data = jsonb_build_object(
        'personalInfo', jsonb_build_object(
            'firstName', 'Pete',
            'lastName', 'Park',
            'email', COALESCE(email, 'pete@example.com'),
            'phone', COALESCE(profile_data->'personalInfo'->>'phone', '')
        ),
        'golfInfo', jsonb_build_object(
            'handicap', '1',
            'homeClub', 'Pattana Golf Resort & Spa',
            'clubAffiliation', 'Travellers Rest Golf Group'
        )
    ),
    updated_at = NOW()
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

COMMIT;

-- =====================================================================
-- VERIFICATION
-- =====================================================================

-- Check Pete's profile
SELECT
    line_user_id,
    name,
    username,
    role,
    email,
    home_club,
    home_course_name,
    society_name,
    profile_data->'personalInfo' as personal_info,
    profile_data->'golfInfo' as golf_info,
    created_at,
    updated_at
FROM user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- =====================================================================
-- SUCCESS MESSAGE
-- =====================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'PETE PARK PROFILE RESTORED';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'PROFILE DATA:';
  RAISE NOTICE '  LINE ID: U2b6d976f19bca4b2f4374ae0e10ed873';
  RAISE NOTICE '  Name: Pete Park';
  RAISE NOTICE '  Username: 007';
  RAISE NOTICE '  Role: golfer';
  RAISE NOTICE '  Handicap: 1';
  RAISE NOTICE '  Home Club: Pattana Golf Resort & Spa';
  RAISE NOTICE '  Society: Travellers Rest Golf Group';
  RAISE NOTICE '';
  RAISE NOTICE 'ALL PROFILE DATA FIXED AND SYNCHRONIZED';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;
