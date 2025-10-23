-- =====================================================================
-- INSERT TRGG (TRAVELLERS REST GOLF GROUP) ORGANIZER PROFILE
-- =====================================================================
-- TRGG has events in database but no organizer profile in user_profiles
-- This creates the organizer profile so TRGG shows up in admin dashboard
-- Run this in Supabase SQL Editor
-- =====================================================================

BEGIN;

-- Insert TRGG organizer profile
-- Using the organizer_id from existing events
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
  'U2b6d976f19bca4b2f4374ae0e10ed873',          -- TRGG organizer ID (from events)
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

-- Check the society was inserted
SELECT
  line_user_id,
  name,
  role,
  society_name,
  society_id,
  profile_data->'organizationInfo'->>'societyLogo' as society_logo,
  created_at
FROM user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
   OR society_name = 'Travellers Rest Golf Group';

-- Count all organizer profiles (should be 2: TRGG + Ora Ora Golf)
SELECT
  COUNT(*) as total_societies,
  array_agg(society_name) as society_names
FROM user_profiles
WHERE role = 'organizer';

-- =====================================================================
-- SUCCESS MESSAGE
-- =====================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'TRGG ORGANIZER PROFILE - SUCCESSFULLY ADDED';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'SOCIETY DETAILS:';
  RAISE NOTICE '  Name: Travellers Rest Golf Group';
  RAISE NOTICE '  Organizer ID: U2b6d976f19bca4b2f4374ae0e10ed873';
  RAISE NOTICE '  Role: organizer';
  RAISE NOTICE '  Website: https://www.trggpattaya.com';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '  1. TRGG will now appear in admin dashboard as a golf society';
  RAISE NOTICE '  2. Society count will show 2 (TRGG + Ora Ora Golf)';
  RAISE NOTICE '  3. TRGG events already exist in database';
  RAISE NOTICE '  4. Logo path: societylogos/trgg.jpg';
  RAISE NOTICE '';
  RAISE NOTICE 'ADMIN DASHBOARD:';
  RAISE NOTICE '  - Total Users: Will include TRGG organizer';
  RAISE NOTICE '  - Golf Societies: Will show 2 societies';
  RAISE NOTICE '  - Code update needed to load societies from database';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;
