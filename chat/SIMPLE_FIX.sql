-- =====================================================================
-- SIMPLE FIX - Copy Pete and Donald's UUIDs, paste them below, run entire file
-- =====================================================================

-- =====================================================================
-- STEP 1: First run this to see Pete and Donald's UUIDs
-- =====================================================================
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', raw_user_meta_data->>'displayName', email) AS name
FROM auth.users
ORDER BY created_at DESC;

-- ⚠️ STOP HERE - Look at the results above
-- Find Pete's UUID and Donald's UUID
-- Copy them and paste into the DO block below

-- =====================================================================
-- STEP 2: Paste Pete and Donald's UUIDs below (between the quotes)
-- Then run the ENTIRE file again
-- =====================================================================

DO $$
DECLARE
  pete_uuid uuid := 'PASTE_PETE_UUID_HERE';     -- 👈 PASTE PETE'S UUID HERE
  donald_uuid uuid := 'PASTE_DONALD_UUID_HERE'; -- 👈 PASTE DONALD'S UUID HERE
BEGIN
  -- Ensure profiles table has columns
  EXECUTE 'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_code text';
  EXECUTE 'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text';
  EXECUTE 'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text';
  EXECUTE 'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text';

  -- Create basic profiles for all auth users
  INSERT INTO public.profiles (id, username, display_name)
  SELECT
    u.id,
    COALESCE(u.raw_user_meta_data->>'username', SPLIT_PART(u.email, '@', 1)),
    COALESCE(u.raw_user_meta_data->>'name', u.email)
  FROM auth.users u
  ON CONFLICT (id) DO NOTHING;

  -- Set Pete's code
  UPDATE public.profiles
  SET user_code = '007',
      username = 'pete',
      display_name = 'Pete Park'
  WHERE id = pete_uuid;

  -- Set Donald's code
  UPDATE public.profiles
  SET user_code = '16',
      username = 'donald',
      display_name = 'Donald Lump'
  WHERE id = donald_uuid;

  RAISE NOTICE '✅ Profiles updated!';
END $$;

-- Verify it worked
SELECT id, username, display_name, user_code
FROM public.profiles
WHERE user_code IN ('007', '16');

-- =====================================================================
-- STEP 3: Create view and RPCs
-- =====================================================================

CREATE OR REPLACE VIEW public.chat_users AS
SELECT
  u.id,
  COALESCE(p.display_name, p.username, u.email) AS display_name,
  p.username,
  p.user_code,
  p.avatar_url
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id;

CREATE OR REPLACE FUNCTION public.list_chat_contacts()
RETURNS TABLE (
  id uuid,
  display_name text,
  username text,
  user_code text,
  avatar_url text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT cu.id, cu.display_name, cu.username, cu.user_code, cu.avatar_url
  FROM public.chat_users cu
  WHERE cu.id <> auth.uid()
  ORDER BY cu.display_name ASC
  LIMIT 200;
$$;

CREATE OR REPLACE FUNCTION public.search_chat_contacts(q text)
RETURNS TABLE (
  id uuid,
  display_name text,
  username text,
  user_code text,
  avatar_url text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT cu.id, cu.display_name, cu.username, cu.user_code, cu.avatar_url
  FROM public.chat_users cu
  WHERE cu.id <> auth.uid()
    AND (
      cu.display_name ILIKE '%' || q || '%'
      OR cu.username   ILIKE '%' || q || '%'
      OR cu.user_code  = q
    )
  ORDER BY CASE WHEN cu.user_code = q THEN 0 ELSE 1 END, cu.display_name ASC
  LIMIT 100;
$$;

REVOKE ALL ON FUNCTION public.list_chat_contacts() FROM public;
REVOKE ALL ON FUNCTION public.search_chat_contacts(text) FROM public;
GRANT EXECUTE ON FUNCTION public.list_chat_contacts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_chat_contacts(text) TO authenticated;

SELECT pg_notify('pgrst', 'reload schema');

-- =====================================================================
-- STEP 4: Verify everything works
-- =====================================================================

SELECT 'chat_users view' AS test, * FROM public.chat_users WHERE user_code IN ('007','16');
SELECT 'list_chat_contacts()' AS test, * FROM public.list_chat_contacts();
SELECT 'search for 16' AS test, * FROM public.search_chat_contacts('16');
SELECT 'search for donald' AS test, * FROM public.search_chat_contacts('donald');
SELECT 'search for 007' AS test, * FROM public.search_chat_contacts('007');

-- ✅ DONE!
