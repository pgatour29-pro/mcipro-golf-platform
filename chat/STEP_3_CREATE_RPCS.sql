-- =====================================================================
-- STEP 3: Create chat_users view and contact RPCs
-- =====================================================================

-- Create the chat_users view (auth.users ↔ profiles join)
CREATE OR REPLACE VIEW public.chat_users AS
SELECT
  u.id,
  COALESCE(p.display_name, p.username, u.email) AS display_name,
  p.username,
  p.user_code,
  p.avatar_url
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id;

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
AS $$
  SELECT cu.id, cu.display_name, cu.username, cu.user_code, cu.avatar_url
  FROM public.chat_users cu
  WHERE cu.id <> auth.uid()
  ORDER BY cu.display_name ASC
  LIMIT 200;
$$;

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

-- Set permissions
REVOKE ALL ON FUNCTION public.list_chat_contacts()           FROM public;
REVOKE ALL ON FUNCTION public.search_chat_contacts(text)     FROM public;
GRANT EXECUTE ON FUNCTION public.list_chat_contacts()        TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_chat_contacts(text)  TO authenticated;

-- Force PostgREST to reload (fixes 404 on /rpc/*)
SELECT pg_notify('pgrst', 'reload schema');

-- =====================================================================
-- Success message
-- =====================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Chat contacts setup complete!';
  RAISE NOTICE '   - chat_users view created';
  RAISE NOTICE '   - list_chat_contacts() RPC created';
  RAISE NOTICE '   - search_chat_contacts(q) RPC created';
  RAISE NOTICE '   - Schema reloaded';
END $$;
