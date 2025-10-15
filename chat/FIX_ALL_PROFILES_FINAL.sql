-- =====================================================================
-- FINAL FIX: Show all profiles, delete empty ones, fix Donald
-- =====================================================================

-- 1. Show ALL profiles currently in database
SELECT
  'CURRENT PROFILES' as status,
  id,
  username,
  display_name,
  email
FROM profiles
ORDER BY created_at;

-- 2. Delete profiles with empty or NULL names
DELETE FROM profiles
WHERE COALESCE(NULLIF(TRIM(display_name), ''), NULLIF(TRIM(username), '')) IS NULL;

-- 3. Update any remaining profiles from auth.users data
UPDATE profiles p
SET
  display_name = COALESCE(
    NULLIF(TRIM(p.display_name), ''),
    au.raw_user_meta_data->>'display_name',
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->>'full_name',
    SPLIT_PART(au.email, '@', 1),
    'User'
  ),
  username = COALESCE(
    NULLIF(TRIM(p.username), ''),
    au.raw_user_meta_data->>'username',
    SPLIT_PART(au.email, '@', 1)
  ),
  updated_at = NOW()
FROM auth.users au
WHERE p.id = au.id;

-- 4. Show final result
SELECT
  'FINAL PROFILES' as status,
  id,
  username,
  display_name,
  email
FROM profiles
ORDER BY display_name;
