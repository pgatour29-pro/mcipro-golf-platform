-- =====================================================================
-- COMPLETE FIX - User's Solution (Copy-Paste Exactly)
-- =====================================================================

-- 1) Make sure user_code is TEXT (so '007' and '16' match exactly)
ALTER TABLE public.profiles
  ALTER COLUMN user_code TYPE text USING user_code::text;

-- 2) A stable view that joins auth.users + profiles for chat
CREATE OR REPLACE VIEW public.chat_users AS
SELECT
  u.id,
  COALESCE(p.display_name, p.username, u.email) AS display_name,
  p.username,
  (p.user_code)::text AS user_code,
  p.avatar_url
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id;  -- ✅ FIXED: p.id not p.user_id

-- 3) Seed/Ensure the two users have the right fields
-- NOTE: Replace uuid_pete and uuid_donald with actual auth.user IDs
-- Run: select id, email from auth.users; to get the IDs

INSERT INTO public.profiles (id, display_name, username, user_code, avatar_url)
VALUES
  ('uuid_pete',   'Pete Park',   'pete',   '007', NULL)
ON CONFLICT (id) DO UPDATE
SET display_name = EXCLUDED.display_name,
    username     = EXCLUDED.username,
    user_code    = EXCLUDED.user_code;

INSERT INTO public.profiles (id, display_name, username, user_code, avatar_url)
VALUES
  ('uuid_donald', 'Donald Lump', 'donald', '16',  NULL)
ON CONFLICT (id) DO UPDATE
SET display_name = EXCLUDED.display_name,
    username     = EXCLUDED.username,
    user_code    = EXCLUDED.user_code;

-- 4) RLS-safe search RPC (excludes yourself)
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
AS $DOLLAR$
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
$DOLLAR$;

REVOKE ALL ON FUNCTION public.search_chat_contacts(text) FROM public;
GRANT EXECUTE ON FUNCTION public.search_chat_contacts(text) TO authenticated;

-- 5) List all contacts (except me)
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
AS $DOLLAR$
  SELECT cu.id, cu.display_name, cu.username, cu.user_code, cu.avatar_url
  FROM public.chat_users cu
  WHERE cu.id <> auth.uid()
  ORDER BY cu.display_name ASC
  LIMIT 200;
$DOLLAR$;

REVOKE ALL ON FUNCTION public.list_chat_contacts() FROM public;
GRANT EXECUTE ON FUNCTION public.list_chat_contacts() TO authenticated;

-- 6) Reload schema cache (so API sees new functions - no more 404)
SELECT pg_notify('pgrst', 'reload schema');

-- 7) RLS policy to allow reading profiles (optional - RPC bypasses this anyway)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_read_for_chat" ON public.profiles;
CREATE POLICY "profiles_read_for_chat"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 8) VERIFY IT WORKS (run after replacing UUIDs above)
-- SELECT * FROM public.list_chat_contacts();
-- SELECT * FROM public.search_chat_contacts('16');
-- SELECT * FROM public.search_chat_contacts('donald');
-- SELECT * FROM public.search_chat_contacts('007');
