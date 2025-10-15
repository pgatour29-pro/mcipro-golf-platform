-- =====================================================================
-- FIX: Map auth.users to profiles (Pete & Donald must exist in auth.users)
-- =====================================================================

-- =====================================================================
-- STEP 1: Find who's actually in auth.users
-- =====================================================================

-- A. See all current auth users
SELECT id, email, created_at
FROM auth.users
ORDER BY created_at DESC;

-- B. If using LINE login, pull display names from identities
SELECT
  u.id,
  i.provider,
  COALESCE(i.identity_data->>'name', i.identity_data->>'displayName') AS line_name,
  i.identity_data->>'picture' AS line_picture,
  u.created_at
FROM auth.users u
JOIN auth.identities i ON i.user_id = u.id
WHERE i.provider = 'line'
ORDER BY u.created_at DESC;

-- 👉 IMPORTANT: If Pete and Donald are NOT in the results above:
--    1. Have them log in once via your app (so Supabase creates auth.users rows)
--    2. Re-run the queries above to get their UUIDs
--    3. Then continue with Step 2 below

-- =====================================================================
-- STEP 2: Create/repair public.profiles for every real auth user
-- =====================================================================

-- Ensure profiles table has the columns we expect (safe, idempotent)
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

-- Double-check join now returns rows
SELECT * FROM public.profiles p
WHERE p.id IN (SELECT id FROM auth.users);

-- =====================================================================
-- STEP 3: Set Pete & Donald's codes explicitly
-- ⚠️ REPLACE <PETE_AUTH_UUID> and <DONALD_AUTH_UUID> with actual UUIDs from Step 1
-- =====================================================================

-- Update Pete's profile
UPDATE public.profiles
SET user_code = '007',
    username = COALESCE(username, 'pete'),
    display_name = COALESCE(display_name, 'Pete Park')
WHERE id = '<PETE_AUTH_UUID>';

-- Update Donald's profile
UPDATE public.profiles
SET user_code = '16',
    username = COALESCE(username, 'donald'),
    display_name = COALESCE(display_name, 'Donald Lump')
WHERE id = '<DONALD_AUTH_UUID>';

-- =====================================================================
-- STEP 4: Create the chat_users view (auth.users ↔ profiles join)
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

-- =====================================================================
-- STEP 5: Create RPCs (list and search contacts)
-- =====================================================================

-- List contacts (everyone except me)
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
AS $fn$
  SELECT cu.id, cu.display_name, cu.username, cu.user_code, cu.avatar_url
  FROM public.chat_users cu
  WHERE cu.id <> auth.uid()
  ORDER BY cu.display_name ASC
  LIMIT 200;
$fn$;

-- Search by name/username or exact user_code
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
AS $fn$
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
$fn$;

-- Set permissions
REVOKE ALL ON FUNCTION public.list_chat_contacts()           FROM public;
REVOKE ALL ON FUNCTION public.search_chat_contacts(text)     FROM public;
GRANT EXECUTE ON FUNCTION public.list_chat_contacts()        TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_chat_contacts(text)  TO authenticated;

-- Force PostgREST to reload (fixes 404 on /rpc/*)
SELECT pg_notify('pgrst', 'reload schema');

-- =====================================================================
-- STEP 6: VERIFY IT WORKS
-- =====================================================================

-- Check the view resolves Pete (007) and Donald (16)
SELECT * FROM public.chat_users WHERE user_code IN ('007','16');

-- Test the RPCs
SELECT 'list_chat_contacts()' AS test, * FROM public.list_chat_contacts();
SELECT 'search for 16' AS test, * FROM public.search_chat_contacts('16');
SELECT 'search for donald' AS test, * FROM public.search_chat_contacts('donald');
SELECT 'search for 007' AS test, * FROM public.search_chat_contacts('007');

-- ✅ EXPECTED RESULTS:
-- - list_chat_contacts() returns ONE user (the other person, not you)
-- - search '16' returns Donald Lump only
-- - search 'donald' returns Donald Lump only
-- - search '007' returns Pete Park only
-- - You NEVER see yourself in any results

-- =====================================================================
-- STEP 7: Clean up garbage users (OPTIONAL)
-- =====================================================================

-- ⚠️ You CANNOT delete from auth.users via SQL
-- Use Dashboard → Authentication → Users to remove junk manually

-- You CAN remove orphaned profiles/messages/memberships:
-- (Only run if you're sure you want to purge orphans)

-- DELETE FROM public.chat_room_members m
-- WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = m.user_id);

-- DELETE FROM public.chat_messages msg
-- WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = msg.sender);

-- DELETE FROM public.profiles p
-- WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id);
