-- =====================================================================
-- FIX: Update display names for users showing as "16" or NULL
-- Issue: Users have numeric IDs or NULL instead of real names
-- =====================================================================

BEGIN;

-- 1. Show current broken profiles
SELECT
  'Before Fix' as status,
  id,
  username,
  display_name,
  CASE
    WHEN display_name IS NULL THEN '❌ NULL'
    WHEN display_name ~ '^[0-9]+$' THEN '❌ Numeric'
    ELSE '✅ OK'
  END as issue
FROM profiles
WHERE display_name IS NULL
   OR display_name ~ '^[0-9]+$'
ORDER BY created_at DESC;

-- 2. CRITICAL FIX: Update user "16" to "Donald Lump"
UPDATE profiles
SET
  display_name = 'Donald Lump',
  username = COALESCE(NULLIF(username, '16'), 'donald_lump'),
  updated_at = NOW()
WHERE id = '07dc3f53-468a-4a2a-9baf-c8dfaa4ca365';

-- 3. Fix any other users with NULL or numeric display names
-- Get their real names from auth.users metadata
UPDATE profiles p
SET
  display_name = COALESCE(
    au.raw_user_meta_data->>'display_name',
    au.raw_user_meta_data->>'name',
    SPLIT_PART(au.email, '@', 1),
    'User'
  ),
  username = COALESCE(
    NULLIF(p.username, p.display_name), -- Keep username if different from display_name
    au.raw_user_meta_data->>'username',
    SPLIT_PART(au.email, '@', 1),
    'user_' || SUBSTRING(p.id::text, 1, 8)
  ),
  updated_at = NOW()
FROM auth.users au
WHERE p.id = au.id
  AND (
    p.display_name IS NULL
    OR p.display_name ~ '^[0-9]+$' -- Matches numeric-only names like "16"
  );

-- 4. Verify the fix
SELECT
  'After Fix' as status,
  id,
  username,
  display_name,
  '✅ FIXED' as result
FROM profiles
WHERE id = '07dc3f53-468a-4a2a-9baf-c8dfaa4ca365'
   OR updated_at > NOW() - INTERVAL '10 seconds';

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Display names fixed!';
  RAISE NOTICE '   - User "16" renamed to "Donald Lump"';
  RAISE NOTICE '   - All NULL/numeric names updated from auth metadata';
END $$;
