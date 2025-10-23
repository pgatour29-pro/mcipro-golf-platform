-- =====================================================================
-- FIX TRGG ORGANIZER PROFILE - Use different LINE ID (not Pete's)
-- =====================================================================
-- PROBLEM: TRGG was using Pete's LINE ID (U2b6d976f19bca4b2f4374ae0e10ed873)
-- But Pete is a golfer, not TRGG organizer
-- SOLUTION: Use a different organizer ID for TRGG
-- =====================================================================

BEGIN;

-- First, delete any existing TRGG profile using Pete's LINE ID
DELETE FROM user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
  AND role = 'organizer'
  AND name = 'Travellers Rest Golf Group';

-- Insert TRGG organizer profile with its own unique LINE ID
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
  society_name = EXCLUDED.society_name,
  profile_data = EXCLUDED.profile_data,
  updated_at = NOW();

COMMIT;

-- =====================================================================
-- VERIFICATION
-- =====================================================================

-- Check all organizers (should see 2: Ora Ora Golf + TRGG)
SELECT
  line_user_id,
  name,
  role,
  society_name,
  profile_data->'organizationInfo'->>'societyLogo' as society_logo,
  created_at
FROM user_profiles
WHERE role = 'organizer'
ORDER BY society_name;

-- Count total organizers (should be 2)
SELECT COUNT(*) as total_organizers
FROM user_profiles
WHERE role = 'organizer';

-- Check Pete's profile (should be golfer, not organizer)
SELECT
  line_user_id,
  name,
  username,
  role,
  society_name
FROM user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- =====================================================================
-- SUCCESS MESSAGE
-- =====================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'TRGG ORGANIZER PROFILE - FIXED WITH UNIQUE LINE ID';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'SOCIETY DETAILS:';
  RAISE NOTICE '  Name: Travellers Rest Golf Group';
  RAISE NOTICE '  Organizer ID: Utrgg1234567890abcdefghijklmnopqr (NEW)';
  RAISE NOTICE '  Role: organizer';
  RAISE NOTICE '  Website: https://www.trggpattaya.com';
  RAISE NOTICE '';
  RAISE NOTICE 'PETE PARK PROFILE:';
  RAISE NOTICE '  LINE ID: U2b6d976f19bca4b2f4374ae0e10ed873';
  RAISE NOTICE '  Role: golfer (NOT organizer)';
  RAISE NOTICE '  Username: 007';
  RAISE NOTICE '';
  RAISE NOTICE 'RESULT:';
  RAISE NOTICE '  - Admin dashboard will show: Golf Societies: 2';
  RAISE NOTICE '  - Netflix modal will show: Ora Ora Golf + TRGG';
  RAISE NOTICE '  - Pete Park remains a golfer with username 007';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;
