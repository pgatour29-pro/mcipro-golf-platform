-- =====================================================================
-- DELETE all test users and NULL profiles from database
-- =====================================================================

BEGIN;

-- 1. Show what we're about to delete
SELECT
  'TO BE DELETED' as action,
  id,
  username,
  display_name,
  CASE
    WHEN display_name IS NULL THEN 'NULL NAME'
    WHEN display_name ILIKE '%test%' THEN 'TEST USER'
    WHEN display_name ILIKE '%tester%' THEN 'TESTER'
    WHEN username ILIKE '%test%' THEN 'TEST USERNAME'
    ELSE 'OTHER'
  END as reason
FROM profiles
WHERE display_name IS NULL
   OR display_name ILIKE '%test%'
   OR display_name ILIKE '%tester%'
   OR username ILIKE '%test%';

-- 2. DELETE test users and NULL profiles permanently
DELETE FROM profiles
WHERE display_name IS NULL
   OR display_name ILIKE '%test%'
   OR display_name ILIKE '%tester%'
   OR username ILIKE '%test%';

-- 3. Show remaining profiles (clean list)
SELECT
  'REMAINING PROFILES' as result,
  id,
  username,
  display_name,
  created_at
FROM profiles
ORDER BY display_name;

-- 4. Count what's left
SELECT
  'SUMMARY' as type,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE display_name IS NOT NULL) as valid_names
FROM profiles;

COMMIT;

-- Success message
DO $$
DECLARE
  deleted_count INT;
BEGIN
  SELECT COUNT(*) INTO deleted_count
  FROM profiles
  WHERE display_name IS NULL
     OR display_name ILIKE '%test%'
     OR display_name ILIKE '%tester%'
     OR username ILIKE '%test%';

  RAISE NOTICE '✅ Database cleaned!';
  RAISE NOTICE '   - Deleted % test/NULL users', deleted_count;
  RAISE NOTICE '   - Only real users remain';
END $$;
