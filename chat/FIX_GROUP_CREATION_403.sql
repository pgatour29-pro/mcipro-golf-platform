-- =====================================================================
-- FIX: 403 Forbidden when creating groups
-- =====================================================================
-- Problem: "new row violates row-level security policy for table chat_rooms"
-- Error code: 42501 (insufficient_privilege)
--
-- This happens when there are RESTRICTIVE policies or the INSERT policy
-- has incorrect logic.
-- =====================================================================

-- STEP 1: Drop ALL existing policies on chat_rooms (clean slate)
DROP POLICY IF EXISTS "Users can view rooms they are members of" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can create DM rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can create group rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.chat_rooms;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.chat_rooms;

-- STEP 2: Verify helper function exists
CREATE OR REPLACE FUNCTION public.user_is_room_member(p_room_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = p_room_id
    AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_group_member(p_room_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_room_members
    WHERE room_id = p_room_id
    AND user_id = auth.uid()
    AND status = 'approved'
  );
$$;

-- STEP 3: Create SELECT policy (view rooms)
CREATE POLICY "Users can view rooms they are members of"
  ON public.chat_rooms FOR SELECT
  USING (
    (type = 'dm' AND public.user_is_room_member(id))
    OR
    (type = 'group' AND public.user_is_group_member(id))
  );

-- STEP 4: Create INSERT policy with simplified logic
-- Key: Allow INSERT as long as the user is authenticated
-- The created_by field must match auth.uid() for groups
CREATE POLICY "Users can create rooms"
  ON public.chat_rooms FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      (type = 'dm' AND (created_by IS NULL OR created_by = auth.uid()))
      OR
      (type = 'group' AND created_by = auth.uid())
    )
  );

-- STEP 5: Grant permissions
GRANT EXECUTE ON FUNCTION public.user_is_room_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_group_member(uuid) TO authenticated;

-- STEP 6: Verify policies
SELECT
  tablename,
  policyname,
  cmd,
  permissive,
  CASE
    WHEN cmd = 'SELECT' THEN '✅ Can view rooms'
    WHEN cmd = 'INSERT' THEN '✅ Can create rooms'
    ELSE cmd
  END as description
FROM pg_policies
WHERE tablename = 'chat_rooms'
ORDER BY cmd;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Group creation 403 fix applied!';
  RAISE NOTICE '🔐 RLS policies recreated for chat_rooms';
  RAISE NOTICE '📝 INSERT policy now allows group creation';
END $$;
