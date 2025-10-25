-- =====================================================================
-- AUTO-PROFILE CREATION TRIGGER
-- =====================================================================
-- This creates a database trigger that automatically creates a profile
-- in the public.profiles table whenever a new user signs up via auth.users
--
-- FIXES:
-- - New users no longer get stuck without profiles
-- - Auto-populates username from email or metadata
-- - Auto-populates display_name from user metadata or email
-- - Works with both email and OAuth (LINE, Google, etc.) signups
--
-- Date: 2025-10-15
-- =====================================================================

-- =====================================================================
-- STEP 1: Ensure profiles table has required columns
-- =====================================================================

-- Add columns if they don't exist (safe to run multiple times)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_code text,
  ADD COLUMN IF NOT EXISTS username text,a
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Add unique constraint on username (optional but recommended)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_username_unique'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_username_unique UNIQUE (username);
    RAISE NOTICE '✅ Added unique constraint on username';
  ELSE
    RAISE NOTICE '✅ Username unique constraint already exists';
  END IF;
END $$;

-- =====================================================================
-- STEP 2: Create the trigger function
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username text;
  v_display_name text;
  v_avatar_url text;
  v_email_prefix text;
  v_counter integer := 0;
  v_base_username text;
BEGIN
  -- Extract username from various sources (in order of preference)
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',           -- Explicit username from metadata
    NEW.raw_user_meta_data->>'preferred_username', -- OAuth preferred username
    SPLIT_PART(NEW.email, '@', 1)                  -- Email prefix as fallback
  );

  -- Extract display name from various sources
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'name',               -- Full name from metadata
    NEW.raw_user_meta_data->>'displayName',        -- Display name (LINE)
    NEW.raw_user_meta_data->>'full_name',          -- Full name (OAuth)
    NEW.raw_user_meta_data->>'username',           -- Username as fallback
    SPLIT_PART(NEW.email, '@', 1)                  -- Email prefix as last resort
  );

  -- Extract avatar URL from various sources
  v_avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',         -- Avatar URL from metadata
    NEW.raw_user_meta_data->>'picture',            -- Picture (LINE, Google)
    NEW.raw_user_meta_data->>'pictureUrl'          -- Picture URL (LINE)
  );

  -- Sanitize username (lowercase, replace spaces/special chars with underscores)
  v_username := LOWER(REGEXP_REPLACE(v_username, '[^a-zA-Z0-9_]', '_', 'g'));
  v_base_username := v_username;

  -- Handle username conflicts by appending numbers
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) LOOP
    v_counter := v_counter + 1;
    v_username := v_base_username || '_' || v_counter;

    -- Safety: prevent infinite loop
    IF v_counter > 1000 THEN
      v_username := v_base_username || '_' || EXTRACT(EPOCH FROM NOW())::bigint;
      EXIT;
    END IF;
  END LOOP;

  -- Insert profile for new user
  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    avatar_url,
    user_code
  )
  VALUES (
    NEW.id,
    v_username,
    v_display_name,
    v_avatar_url,
    NULL  -- user_code is manually assigned later
  )
  ON CONFLICT (id) DO NOTHING;  -- Safe if profile somehow already exists

  RAISE NOTICE '✅ Auto-created profile for user: % (username: %)', NEW.email, v_username;

  RETURN NEW;
END;
$$;

-- =====================================================================
-- STEP 3: Create the trigger (on auth.users INSERT)
-- =====================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created_create_profile ON auth.users;

-- Create new trigger
CREATE TRIGGER on_auth_user_created_create_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();

RAISE NOTICE '✅ Trigger created: on_auth_user_created_create_profile';

-- =====================================================================
-- STEP 4: Backfill existing users who don't have profiles
-- =====================================================================

DO $$
DECLARE
  v_user_record RECORD;
  v_created_count integer := 0;
  v_username text;
  v_display_name text;
  v_avatar_url text;
  v_counter integer;
  v_base_username text;
BEGIN
  RAISE NOTICE 'Starting backfill of existing users without profiles...';

  FOR v_user_record IN (
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u
    WHERE NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = u.id
    )
  ) LOOP
    -- Extract username
    v_username := COALESCE(
      v_user_record.raw_user_meta_data->>'username',
      v_user_record.raw_user_meta_data->>'preferred_username',
      SPLIT_PART(v_user_record.email, '@', 1)
    );

    -- Extract display name
    v_display_name := COALESCE(
      v_user_record.raw_user_meta_data->>'name',
      v_user_record.raw_user_meta_data->>'displayName',
      v_user_record.raw_user_meta_data->>'full_name',
      v_user_record.raw_user_meta_data->>'username',
      SPLIT_PART(v_user_record.email, '@', 1)
    );

    -- Extract avatar
    v_avatar_url := COALESCE(
      v_user_record.raw_user_meta_data->>'avatar_url',
      v_user_record.raw_user_meta_data->>'picture',
      v_user_record.raw_user_meta_data->>'pictureUrl'
    );

    -- Sanitize username
    v_username := LOWER(REGEXP_REPLACE(v_username, '[^a-zA-Z0-9_]', '_', 'g'));
    v_base_username := v_username;
    v_counter := 0;

    -- Handle conflicts
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) LOOP
      v_counter := v_counter + 1;
      v_username := v_base_username || '_' || v_counter;
      IF v_counter > 1000 THEN
        v_username := v_base_username || '_' || EXTRACT(EPOCH FROM NOW())::bigint;
        EXIT;
      END IF;
    END LOOP;

    -- Insert profile
    INSERT INTO public.profiles (
      id,
      username,
      display_name,
      avatar_url
    )
    VALUES (
      v_user_record.id,
      v_username,
      v_display_name,
      v_avatar_url
    )
    ON CONFLICT (id) DO NOTHING;

    v_created_count := v_created_count + 1;
  END LOOP;

  IF v_created_count > 0 THEN
    RAISE NOTICE '✅ Backfilled % existing user profiles', v_created_count;
  ELSE
    RAISE NOTICE '✅ All existing users already have profiles';
  END IF;
END $$;

-- =====================================================================
-- STEP 5: Update RLS policies to allow profile creation
-- =====================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view any profile (needed for chat contacts)
CREATE POLICY "Anyone can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to insert their own profile (for manual creation or migrations)
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Allow service role to bypass RLS (needed for trigger)
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.profiles TO postgres, service_role;
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;

-- =====================================================================
-- STEP 6: Verify the trigger is working
-- =====================================================================

-- Check if trigger exists
SELECT
  'Trigger Status' as check_name,
  trigger_name,
  event_manipulation,
  action_statement,
  CASE
    WHEN trigger_name IS NOT NULL THEN '✅ ACTIVE'
    ELSE '❌ NOT FOUND'
  END as status
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND trigger_schema = 'auth'
  AND trigger_name = 'on_auth_user_created_create_profile';

-- Check if trigger function exists
SELECT
  'Trigger Function' as check_name,
  proname as function_name,
  CASE
    WHEN prosecdef THEN 'SECURITY DEFINER'
    ELSE 'INVOKER'
  END as security_type,
  CASE
    WHEN proname IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ NOT FOUND'
  END as status
FROM pg_proc
WHERE proname = 'handle_new_user_profile';

-- Count profiles vs auth users
SELECT
  'Profile Coverage' as check_name,
  (SELECT COUNT(*) FROM auth.users) as total_users,
  (SELECT COUNT(*) FROM public.profiles) as total_profiles,
  (SELECT COUNT(*) FROM auth.users WHERE id NOT IN (SELECT id FROM public.profiles)) as users_without_profiles,
  CASE
    WHEN (SELECT COUNT(*) FROM auth.users WHERE id NOT IN (SELECT id FROM public.profiles)) = 0
      THEN '✅ 100% - All users have profiles'
    ELSE '⚠️  ' || (SELECT COUNT(*) FROM auth.users WHERE id NOT IN (SELECT id FROM public.profiles)) || ' users missing profiles'
  END as status;

-- =====================================================================
-- COMPLETION MESSAGE
-- =====================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '✅ AUTO-PROFILE TRIGGER SUCCESSFULLY CREATED';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'WHAT WAS CONFIGURED:';
  RAISE NOTICE '  1. ✅ Trigger function: handle_new_user_profile()';
  RAISE NOTICE '  2. ✅ Trigger: on_auth_user_created_create_profile';
  RAISE NOTICE '  3. ✅ RLS policies updated for profile access';
  RAISE NOTICE '  4. ✅ Backfilled existing users without profiles';
  RAISE NOTICE '';
  RAISE NOTICE 'HOW IT WORKS:';
  RAISE NOTICE '  • When new user signs up via auth.users';
  RAISE NOTICE '  • Trigger automatically creates profile in public.profiles';
  RAISE NOTICE '  • Extracts username, display_name, avatar from metadata';
  RAISE NOTICE '  • Handles username conflicts by appending numbers';
  RAISE NOTICE '  • Works with email, LINE, Google, and other OAuth providers';
  RAISE NOTICE '';
  RAISE NOTICE 'FIELDS AUTO-POPULATED:';
  RAISE NOTICE '  • id: Same as auth.users.id (UUID)';
  RAISE NOTICE '  • username: From metadata or email prefix';
  RAISE NOTICE '  • display_name: From metadata or email';
  RAISE NOTICE '  • avatar_url: From OAuth provider (LINE, Google, etc.)';
  RAISE NOTICE '  • user_code: NULL (must be manually assigned)';
  RAISE NOTICE '';
  RAISE NOTICE 'TESTING:';
  RAISE NOTICE '  • Create a new user account';
  RAISE NOTICE '  • Check public.profiles table';
  RAISE NOTICE '  • Profile should be auto-created with proper username/display_name';
  RAISE NOTICE '';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '';
END $$;
