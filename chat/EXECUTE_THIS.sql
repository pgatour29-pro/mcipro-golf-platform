-- =====================================================================
-- CHAT CONTACTS FIX - Run this entire file in Supabase SQL Editor
-- =====================================================================

-- 1) VERIFY SCHEMA
-- What columns does profiles actually have?
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema='public' AND table_name='profiles'
ORDER BY column_name;

-- 2) ADD MISSING COLUMNS (if needed)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_code text,
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- 3) CREATE VIEW (auth.users ↔ profiles join on id)
CREATE OR REPLACE VIEW public.chat_users AS
SELECT
  u.id,
  COALESCE(p.display_name, p.username, u.email) AS display_name,
  p.username,
  p.user_code,
  p.avatar_url
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id;

-- Quick check: what does the view return right now?
SELECT * FROM public.chat_users ORDER BY display_name NULLS LAST;

-- 4) CREATE RPC: list all contacts (exclude me)
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

-- 5) CREATE RPC: search contacts by name/username/code
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

-- 6) SET PERMISSIONS
REVOKE ALL ON FUNCTION public.list_chat_contacts()           FROM public;
REVOKE ALL ON FUNCTION public.search_chat_contacts(text)     FROM public;
GRANT  EXECUTE ON FUNCTION public.list_chat_contacts()       TO authenticated;
GRANT  EXECUTE ON FUNCTION public.search_chat_contacts(text) TO authenticated;

-- 7) RELOAD SCHEMA (prevents 404 on /rpc/* calls)
SELECT pg_notify('pgrst', 'reload schema');

-- =====================================================================
-- 8) SEED PETE & DONALD
-- ⚠️ REPLACE <UUID_OF_PETE> and <UUID_OF_DONALD> with actual UUIDs
-- =====================================================================

-- First, find their auth UUIDs:
SELECT id, email FROM auth.users ORDER BY created_at DESC;

-- Then replace the UUIDs below and uncomment:

-- INSERT INTO public.profiles (id, user_code, username, display_name, avatar_url)
-- VALUES
--   ('<UUID_OF_PETE>',   '007', 'pete',   'Pete Park',   NULL),
--   ('<UUID_OF_DONALD>', '16',  'donald', 'Donald Lump', NULL)
-- ON CONFLICT (id) DO UPDATE
--   SET user_code    = EXCLUDED.user_code,
--       username     = EXCLUDED.username,
--       display_name = EXCLUDED.display_name;

-- =====================================================================
-- 9) VERIFY IT WORKS
-- =====================================================================

-- Check the view resolves Pete (007) and Donald (16)
SELECT * FROM public.chat_users WHERE user_code IN ('007','16');

-- Test the RPCs (run these AFTER seeding Pete & Donald above)
-- SELECT 'list_chat_contacts()' AS test, * FROM public.list_chat_contacts();
-- SELECT 'search for 16' AS test, * FROM public.search_chat_contacts('16');
-- SELECT 'search for donald' AS test, * FROM public.search_chat_contacts('donald');
-- SELECT 'search for 007' AS test, * FROM public.search_chat_contacts('007');

-- ✅ EXPECTED RESULTS:
-- - chat_users view shows both Pete and Donald with their codes
-- - list_chat_contacts() returns ONE user (the other person, not you)
-- - search '16' returns Donald Lump only
-- - search 'donald' returns Donald Lump only
-- - search '007' returns Pete Park only
-- - You NEVER see yourself in any results

-- =====================================================================
-- 10) IF STILL BROKEN: DEBUG
-- =====================================================================

-- If chat_users only shows 1 row, check ID mismatch:
-- SELECT 'auth.users' AS source, id, email FROM auth.users
-- UNION ALL
-- SELECT 'profiles' AS source, id, display_name FROM public.profiles
-- ORDER BY source, id;

-- Problem: profiles.id doesn't match auth.users.id
-- Solution: Make profiles.id equal to auth.users.id (same UUID)
