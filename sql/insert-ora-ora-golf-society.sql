-- =====================================================================
-- INSERT ORA ORA GOLF SOCIETY
-- =====================================================================
-- This creates a society organizer profile for Ora Ora Golf
-- Allows them to create events and appear in society selection dropdowns
-- Run this in Supabase SQL Editor
-- =====================================================================

BEGIN;

-- Insert Ora Ora Golf society organizer profile
-- Using a generated organizer ID (you can change this to their actual LINE user ID if known)
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
  'Uabcdef1234567890abcdef1234567890',         -- Organizer ID (change if you have their LINE user ID)
  'Ora Ora Golf',                               -- Display name
  'info@oraoragolf.com',                        -- Email (update if you have real email)
  'organizer',                                  -- Role
  'Ora Ora Golf',                               -- Society name
  NULL,                                         -- Society ID (set to NULL)
  jsonb_build_object(
    'organizationInfo', jsonb_build_object(
      'societyName', 'Ora Ora Golf',
      'societyId', 'ora-ora-golf',
      'description', 'Ora Ora Golf Society',
      'societyLogo', 'societylogos/oraoragolf.jpg'
    ),
    'contactInfo', jsonb_build_object(
      'email', 'info@oraoragolf.com'
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
WHERE line_user_id = 'Uabcdef1234567890abcdef1234567890';

-- =====================================================================
-- SUCCESS MESSAGE
-- =====================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'ORA ORA GOLF SOCIETY - SUCCESSFULLY ADDED';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'SOCIETY DETAILS:';
  RAISE NOTICE '  Name: Ora Ora Golf';
  RAISE NOTICE '  Organizer ID: Uabcdef1234567890abcdef1234567890';
  RAISE NOTICE '  Role: organizer';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '  1. Ora Ora Golf will appear in society selection dropdowns';
  RAISE NOTICE '  2. Can create events using organizer_id: Uabcdef1234567890abcdef1234567890';
  RAISE NOTICE '  3. Upload society logo to: societylogos/oraoragolf.jpg';
  RAISE NOTICE '  4. Update email if you have their real contact email';
  RAISE NOTICE '';
  RAISE NOTICE 'TO CREATE EVENTS FOR ORA ORA GOLF:';
  RAISE NOTICE '  Use organizer_id: Uabcdef1234567890abcdef1234567890';
  RAISE NOTICE '  Use organizer_name: Ora Ora Golf';
  RAISE NOTICE '';
  RAISE NOTICE 'EXAMPLE EVENT INSERT:';
  RAISE NOTICE '  INSERT INTO golf_events (';
  RAISE NOTICE '    id, event_name, event_date, organizer_id, organizer_name, ...';
  RAISE NOTICE '  ) VALUES (';
  RAISE NOTICE '    ''ora-ora-2025-11-01'', ''Ora Ora Monthly'', ''2025-11-01'',';
  RAISE NOTICE '    ''Uabcdef1234567890abcdef1234567890'', ''Ora Ora Golf'', ...';
  RAISE NOTICE '  );';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;
