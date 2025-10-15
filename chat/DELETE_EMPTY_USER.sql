-- =====================================================================
-- DELETE the empty user (a111111...)
-- =====================================================================

BEGIN;

-- 1. Find and show the empty user
SELECT
  'User to DELETE' as action,
  id,
  username,
  display_name,
  created_at
FROM profiles
WHERE display_name = ''
   OR username = ''
   OR (display_name IS NULL AND username IS NULL)
   OR id::text LIKE 'a111111%';

-- 2. DELETE the empty user
DELETE FROM profiles
WHERE display_name = ''
   OR username = ''
   OR (display_name IS NULL AND username IS NULL)
   OR id::text LIKE 'a111111%';

-- 3. Show remaining users
SELECT
  'Remaining Users' as result,
  id,
  username,
  display_name
FROM profiles
ORDER BY display_name;

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Empty user deleted!';
  RAISE NOTICE '   - Only real users remain';
END $$;
