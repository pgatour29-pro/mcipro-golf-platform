-- =====================================================================
-- FIX: Infinite recursion in room_members and chat_messages RLS policies
-- =====================================================================
-- Problem: RLS policies are querying the same tables they're protecting,
-- causing "infinite recursion detected in policy" errors
--
-- Solution: Create SECURITY DEFINER functions that bypass RLS checks
-- Date: 2025-10-13
-- =====================================================================

-- ============================================
-- STEP 1: Create helper functions (SECURITY DEFINER bypasses RLS)
-- ============================================

-- Check if user is a member of a DM room
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

-- Check if user is an approved member of a group room
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

-- Check if user is in ANY room (DM or group)
CREATE OR REPLACE FUNCTION public.user_is_in_room(p_room_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT (
    EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_id = p_room_id
      AND user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.chat_room_members
      WHERE room_id = p_room_id
      AND user_id = auth.uid()
      AND status = 'approved'
    )
  );
$$;

-- Check if user is admin of a group
CREATE OR REPLACE FUNCTION public.user_is_group_admin(p_room_id uuid)
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
    AND role = 'admin'
    AND status = 'approved'
  );
$$;

-- ============================================
-- STEP 2: Drop existing problematic policies
-- ============================================

-- Drop room_members policies
DROP POLICY IF EXISTS "Users can view room members" ON public.room_members;
DROP POLICY IF EXISTS "Users can add members to rooms" ON public.room_members;

-- Drop chat_room_members policies
DROP POLICY IF EXISTS "Users can view group memberships" ON public.chat_room_members;
DROP POLICY IF EXISTS "Users can request to join groups" ON public.chat_room_members;
DROP POLICY IF EXISTS "Admins can manage members" ON public.chat_room_members;
DROP POLICY IF EXISTS "Admins can add members" ON public.chat_room_members;

-- Drop chat_messages policies
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send messages to their rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can read messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can read their messages" ON public.chat_messages;

-- Drop chat_rooms policies (for completeness)
DROP POLICY IF EXISTS "Users can view rooms they are members of" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can create DM rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can create group rooms" ON public.chat_rooms;

-- ============================================
-- STEP 3: Create NEW non-recursive policies
-- ============================================

-- ========== ROOM_MEMBERS (DM) POLICIES ==========

-- Users can view room members IF they are a member of that room
CREATE POLICY "Users can view room members"
  ON public.room_members FOR SELECT
  USING (
    -- Use helper function instead of subquery to prevent recursion
    public.user_is_room_member(room_id)
    OR
    -- Users can always see their own membership
    user_id = auth.uid()
  );

-- Users can add members to DM rooms (for creating new DMs)
CREATE POLICY "Users can add members to rooms"
  ON public.room_members FOR INSERT
  WITH CHECK (true); -- Allow creating DM rooms freely

-- ========== CHAT_ROOM_MEMBERS (Group) POLICIES ==========

-- View memberships in groups you're part of
CREATE POLICY "Users can view group memberships"
  ON public.chat_room_members FOR SELECT
  USING (
    -- Use helper function instead of subquery
    public.user_is_group_member(room_id)
    OR
    -- Users can always see their own membership
    user_id = auth.uid()
  );

-- Request to join a group (self-registration)
CREATE POLICY "Users can request to join groups"
  ON public.chat_room_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
    AND role = 'member'
  );

-- Admins can update member status/role
CREATE POLICY "Admins can manage members"
  ON public.chat_room_members FOR UPDATE
  USING (
    -- Use helper function
    public.user_is_group_admin(room_id)
  );

-- Admins and creators can add members
CREATE POLICY "Admins can add members"
  ON public.chat_room_members FOR INSERT
  WITH CHECK (
    -- Admins can add members (use helper function)
    public.user_is_group_admin(room_id)
    OR
    -- Group creators can add initial members (within 5 minutes)
    EXISTS (
      SELECT 1 FROM public.chat_rooms
      WHERE chat_rooms.id = room_id
      AND chat_rooms.created_by = auth.uid()
      AND chat_rooms.created_at > now() - interval '5 minutes'
    )
  );

-- ========== CHAT_MESSAGES POLICIES ==========

-- View messages in rooms you're a member of
CREATE POLICY "Users can view messages in their rooms"
  ON public.chat_messages FOR SELECT
  USING (
    -- Use helper function to check membership without recursion
    public.user_is_in_room(room_id)
  );

-- Send messages to rooms you're a member of
CREATE POLICY "Users can send messages to their rooms"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    sender = auth.uid()
    AND public.user_is_in_room(room_id)
  );

-- ========== CHAT_ROOMS POLICIES ==========

-- Users can view DM rooms where they are members OR group rooms where they are approved
CREATE POLICY "Users can view rooms they are members of"
  ON public.chat_rooms FOR SELECT
  USING (
    (type = 'dm' AND public.user_is_room_member(id))
    OR
    (type = 'group' AND public.user_is_group_member(id))
  );

-- Users can create DM and group rooms
CREATE POLICY "Users can create rooms"
  ON public.chat_rooms FOR INSERT
  WITH CHECK (
    (type = 'dm' AND created_by IS NULL)
    OR
    (type = 'group' AND created_by = auth.uid())
  );

-- ============================================
-- STEP 4: Grant permissions
-- ============================================

GRANT EXECUTE ON FUNCTION public.user_is_room_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_group_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_in_room(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_group_admin(uuid) TO authenticated;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ RLS infinite recursion fixed!';
  RAISE NOTICE '📝 Created 4 SECURITY DEFINER helper functions';
  RAISE NOTICE '🔐 Recreated all RLS policies without recursion';
  RAISE NOTICE '🚀 Chat system should now work without 500 errors';
END $$;
