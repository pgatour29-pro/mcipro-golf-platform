-- =====================================================================
-- STEP 2: Create profiles and set user codes
-- ⚠️ PASTE THE UUIDs FROM STEP 1 BELOW BEFORE RUNNING
-- =====================================================================

-- Ensure profiles table has the columns we need
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_code    text,
  ADD COLUMN IF NOT EXISTS username     text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS avatar_url   text;

-- Upsert a basic profile row for every auth user (no overwrite of existing data)
INSERT INTO public.profiles (id, user_code, username, display_name, avatar_url)
SELECT
  u.id,
  NULL,  -- we'll set Pete=007 / Donald=16 below
  COALESCE(u.raw_user_meta_data->>'username', SPLIT_PART(u.email, '@', 1)),
  COALESCE(u.raw_user_meta_data->>'name', u.email),
  u.raw_user_meta_data->>'picture'
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- ⚠️ REPLACE THE UUIDs BELOW WITH PETE'S AND DONALD'S ACTUAL UUIDs
-- Copy from STEP 1 results above
-- =====================================================================

-- Update Pete's profile (PASTE PETE'S UUID HERE)
UPDATE public.profiles
SET user_code = '007',
    username = 'pete',
    display_name = 'Pete Park'
WHERE id = 'PASTE_PETE_UUID_HERE';

-- Update Donald's profile (PASTE DONALD'S UUID HERE)
UPDATE public.profiles
SET user_code = '16',
    username = 'donald',
    display_name = 'Donald Lump'
WHERE id = 'PASTE_DONALD_UUID_HERE';

-- Verify the updates worked
SELECT id, username, display_name, user_code
FROM public.profiles
WHERE user_code IN ('007', '16');
