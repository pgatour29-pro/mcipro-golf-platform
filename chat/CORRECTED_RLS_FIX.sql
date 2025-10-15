-- =====================================================================
-- CORRECTED RLS FIX - profiles.id = auth.users.id (no user_id column)
-- =====================================================================

-- 1) Verify your schema first (run this to confirm columns)
SELECT column_name
FROM information_schema.columns
WHERE table_schema='public' AND table_name='profiles'
ORDER BY column_name;

-- 2) Make sure user_code is TEXT (so '007' and '16' match exactly)
ALTER TABLE public.profiles
  ALTER COLUMN user_code TYPE text USING user_code::text;

-- 3) Create view with CORRECT join (profiles.id = auth.users.id)
CREATE OR REPLACE VIEW public.chat_users AS
SELECT
  u.id,
  COALESCE(p.display_name, p.username, u.email) AS display_name,
  p.username,
  (p.user_code)::text AS user_code,
  p.avatar_url
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id;  -- ✅ FIXED: p.id not p.user_id

-- 4) List all contacts RPC (excludes current user)
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
AS $
  SELECT cu.id, cu.display_name, cu.username, cu.user_code, cu.avatar_url
  FROM public.chat_users cu
  WHERE cu.id <> auth.uid()
  ORDER BY cu.display_name ASC
  LIMIT 200;
$;

-- 5) Search contacts RPC (by name/username/exact code)
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
AS $
  SELECT cu.id, cu.display_name, cu.username, cu.user_code, cu.avatar_url
  FROM public.chat_users cu
  WHERE cu.id <> auth.uid()
    AND (
      cu.display_name ILIKE '%' || q || '%'
      OR cu.username   ILIKE '%' || q || '%'
      OR cu.user_code  = q
    )
  ORDER BY
    CASE WHEN cu.user_code = q THEN 0 ELSE 1 END,
    cu.display_name ASC
  LIMIT 100;
$;

-- 6) Set permissions
REVOKE ALL ON FUNCTION public.list_chat_contacts()          FROM public;
REVOKE ALL ON FUNCTION public.search_chat_contacts(text)    FROM public;
GRANT  EXECUTE ON FUNCTION public.list_chat_contacts()       TO authenticated;
GRANT  EXECUTE ON FUNCTION public.search_chat_contacts(text) TO authenticated;

-- 7) Reload schema cache (so API sees new functions - no more 404)
SELECT pg_notify('pgrst', 'reload schema');

-- 8) Seed Pete and Donald profiles
-- ⚠️ REPLACE <UUID_PETE> and <UUID_DONALD> with actual auth.users.id values
-- Run first: SELECT id, email FROM auth.users;

INSERT INTO public.profiles (id, display_name, username, user_code)
VALUES
  ('<UUID_PETE>', 'Pete Park', 'pete', '007')
ON CONFLICT (id) DO UPDATE
SET display_name = EXCLUDED.display_name,
    username     = EXCLUDED.username,
    user_code    = EXCLUDED.user_code;

INSERT INTO public.profiles (id, display_name, username, user_code)
VALUES
  ('<UUID_DONALD>', 'Donald Lump', 'donald', '16')
ON CONFLICT (id) DO UPDATE
SET display_name = EXCLUDED.display_name,
    username     = EXCLUDED.username,
    user_code    = EXCLUDED.user_code;

-- 9) VERIFY IT WORKS
SELECT 'list_chat_contacts()' as test, * FROM public.list_chat_contacts();
SELECT 'search for 16' as test, * FROM public.search_chat_contacts('16');
SELECT 'search for donald' as test, * FROM public.search_chat_contacts('donald');
SELECT 'search for 007' as test, * FROM public.search_chat_contacts('007');

-- ✅ Expected results:
-- - list_chat_contacts() should show ONE user (the other person, not you)
-- - search '16' should return Donald Lump
-- - search 'donald' should return Donald Lump
-- - search '007' should return Pete Park
-- - You should NEVER see yourself in any results
