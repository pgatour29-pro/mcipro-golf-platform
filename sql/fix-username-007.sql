-- =====================================================================
-- FIX USERNAME 007 - Pete Park should be 007, not Travellers Rest
-- =====================================================================
-- Issue: Travellers Rest Golf Group has username 007
-- Fix: Pete Park should have username 007
-- =====================================================================

BEGIN;

-- First, let's see who currently has username '007'
SELECT
    line_user_id,
    name,
    username,
    role,
    email,
    created_at
FROM user_profiles
WHERE username = '007' OR name ILIKE '%pete%park%' OR name ILIKE '%traveller%';

-- If Travellers Rest has '007', remove it (organizers don't need member numbers)
UPDATE user_profiles
SET username = NULL
WHERE name = 'Travellers Rest Golf Group'
  AND role = 'organizer'
  AND username = '007';

-- If Pete Park exists and doesn't have '007', give it to him
UPDATE user_profiles
SET username = '007'
WHERE name ILIKE '%pete%park%'
  AND role = 'golfer'
  AND (username IS NULL OR username != '007');

COMMIT;

-- =====================================================================
-- VERIFICATION
-- =====================================================================

-- Check the results
SELECT
    line_user_id,
    name,
    username,
    role,
    email,
    created_at
FROM user_profiles
WHERE username = '007'
   OR name ILIKE '%pete%park%'
   OR name ILIKE '%traveller%'
ORDER BY role, name;

-- Count total golfers with usernames
SELECT COUNT(*) as golfers_with_usernames
FROM user_profiles
WHERE role = 'golfer' AND username IS NOT NULL;

-- =====================================================================
-- SUCCESS MESSAGE
-- =====================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'USERNAME 007 FIX COMPLETED';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'CHANGES:';
  RAISE NOTICE '  - Removed username 007 from Travellers Rest (organizers dont need member numbers)';
  RAISE NOTICE '  - Assigned username 007 to Pete Park (golfer)';
  RAISE NOTICE '';
  RAISE NOTICE 'VERIFICATION:';
  RAISE NOTICE '  - Check query results above to confirm Pete Park has username 007';
  RAISE NOTICE '  - Travellers Rest should have NULL username (role: organizer)';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;
