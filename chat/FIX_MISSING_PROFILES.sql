-- =====================================================================
-- CRITICAL FIX: Diagnose and restore missing profiles
-- Issue: Donald Lump exists in chat but has no profile record
-- Root cause: Profiles not auto-created when users sign up
-- =====================================================================

BEGIN;

-- 1. DIAGNOSTIC: Check all auth users vs profiles
SELECT
  '1. Auth Users vs Profiles' as check_type,
  COUNT(*) FILTER (WHERE p.id IS NULL) as missing_profiles,
  COUNT(*) FILTER (WHERE p.id IS NOT NULL) as profiles_exist,
  COUNT(*) as total_auth_users
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id;

-- 2. Show which auth users are missing profiles
SELECT
  '2. Missing Profiles' as check_type,
  u.id,
  u.email,
  u.created_at,
  'MISSING FROM PROFILES TABLE' as status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 3. CRITICAL FIX: Create profiles for all auth users that are missing them
-- This will restore Donald Lump and any other missing profiles
INSERT INTO public.profiles (id, username, display_name, created_at, updated_at)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'username', SPLIT_PART(u.email, '@', 1)) as username,
  COALESCE(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'name', SPLIT_PART(u.email, '@', 1)) as display_name,
  u.created_at,
  NOW()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO UPDATE SET
  updated_at = NOW();

-- 4. PERMANENT FIX: Create trigger to auto-create profiles on signup
-- This ensures profiles are ALWAYS created when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.created_at,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger: auto-create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. VERIFICATION: Show all profiles now (should include restored users)
SELECT
  '3. All Profiles After Fix' as check_type,
  p.id,
  p.username,
  p.display_name,
  p.created_at,
  CASE
    WHEN p.updated_at > NOW() - INTERVAL '5 seconds' THEN '✅ JUST RESTORED'
    ELSE '📅 Existing'
  END as status
FROM public.profiles p
ORDER BY p.created_at DESC;

COMMIT;

-- Success message
DO $$
DECLARE
  restored_count INT;
BEGIN
  SELECT COUNT(*) INTO restored_count
  FROM public.profiles
  WHERE updated_at > NOW() - INTERVAL '10 seconds';

  RAISE NOTICE '✅ CRITICAL FIX APPLIED:';
  RAISE NOTICE '   - Restored % missing profile(s)', restored_count;
  RAISE NOTICE '   - Created auto-sync trigger to prevent future losses';
  RAISE NOTICE '   - All auth users now have profiles';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 PERMANENT PROTECTION: Trigger will auto-create profiles for new signups';
END $$;
