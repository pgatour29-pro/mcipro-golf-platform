-- =====================================================================
-- COMPREHENSIVE DATABASE SCHEMA FIX - October 14, 2025
-- =====================================================================
-- This migration consolidates all chat schema fixes into one comprehensive
-- solution that addresses:
--   1. Foreign key mismatches (chat_messages referencing wrong tables)
--   2. RLS policy recursion issues causing 403 errors
--   3. Duplicate room prevention with unique constraints
--   4. Primary key issues causing 409 conflicts
--   5. Table naming inconsistencies (rooms vs chat_rooms)
--
-- IMPORTANT: Review this file carefully before applying.
-- Test on a staging environment first if possible.
-- =====================================================================

BEGIN;

-- =====================================================================
-- SECTION 1: TABLE STRUCTURE CONSOLIDATION
-- =====================================================================
-- The schema has evolved with inconsistent table names. This section
-- standardizes on the "chat_" prefix for all tables.

-- 1.1: Ensure chat_rooms table exists with correct structure
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text CHECK (type IN ('dm', 'group')) DEFAULT 'dm',
  title text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 1.2: Create chat_room_members table for group memberships
CREATE TABLE IF NOT EXISTS public.chat_room_members (
  room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  status text CHECK (status IN ('approved', 'pending', 'blocked')) DEFAULT 'approved',
  invited_by uuid,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

-- 1.3: Create room_members table for DM memberships
CREATE TABLE IF NOT EXISTS public.room_members (
  room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

-- 1.4: Ensure chat_messages table exists with correct structure
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  sender uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================================
-- SECTION 2: FIX FOREIGN KEY CONSTRAINTS
-- =====================================================================
-- Issue: chat_messages.room_id may reference "rooms" instead of "chat_rooms"
-- This causes "Key is not present in table" errors for group chats.

-- 2.1: Drop all existing foreign key constraints on chat_messages.room_id
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT constraint_name
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'chat_messages'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%room_id%'
  ) LOOP
    EXECUTE 'ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    RAISE NOTICE 'Dropped constraint: %', r.constraint_name;
  END LOOP;
END $$;

-- 2.2: Add correct foreign key constraint pointing to chat_rooms
ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES public.chat_rooms(id)
  ON DELETE CASCADE;

-- 2.3: Verify primary key exists on chat_messages to prevent 409 conflicts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'chat_messages'
      AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE public.chat_messages ADD PRIMARY KEY (id);
    RAISE NOTICE 'Added primary key to chat_messages';
  ELSE
    RAISE NOTICE 'Primary key already exists on chat_messages';
  END IF;
END $$;

-- =====================================================================
-- SECTION 3: CREATE INDEXES FOR PERFORMANCE
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_chat_rooms_type ON public.chat_rooms(type);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_created_by ON public.chat_rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_created_at ON public.chat_rooms(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_room_members_room ON public.chat_room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_room_members_user ON public.chat_room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_room_members_status ON public.chat_room_members(status) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_room_members_room ON public.room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user ON public.room_members(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON public.chat_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON public.chat_messages(sender);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON public.chat_messages(created_at DESC);

-- =====================================================================
-- SECTION 4: UNIQUE CONSTRAINTS FOR DUPLICATE PREVENTION
-- =====================================================================
-- Prevent duplicate group rooms with the same name by same creator

-- 4.1: Create unique index for group rooms (same title + creator)
DROP INDEX IF EXISTS idx_chat_rooms_unique_group;
CREATE UNIQUE INDEX idx_chat_rooms_unique_group
  ON public.chat_rooms(created_by, title)
  WHERE type = 'group' AND title IS NOT NULL;

-- 4.2: Clean up existing duplicates (keep most recent, remove older)
DO $$
DECLARE
  v_deleted_count integer := 0;
BEGIN
  WITH duplicates AS (
    SELECT
      title,
      created_by,
      array_agg(id ORDER BY created_at DESC) as room_ids
    FROM chat_rooms
    WHERE type = 'group'
      AND title IS NOT NULL
      AND created_by IS NOT NULL
    GROUP BY title, created_by
    HAVING COUNT(*) > 1
  ),
  rooms_to_delete AS (
    SELECT unnest(room_ids[2:]) as room_id
    FROM duplicates
  )
  DELETE FROM chat_rooms
  WHERE id IN (SELECT room_id FROM rooms_to_delete);

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % duplicate group rooms', v_deleted_count;
END $$;

-- =====================================================================
-- SECTION 5: HELPER FUNCTIONS TO PREVENT RLS RECURSION
-- =====================================================================
-- These SECURITY DEFINER functions bypass RLS and prevent infinite
-- recursion errors when policies query the same tables they protect.

-- 5.1: Check if user is a member of a DM room
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

-- 5.2: Check if user is an approved member of a group room
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

-- 5.3: Check if user is in ANY room (DM or group)
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

-- 5.4: Check if user is admin of a group
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

-- =====================================================================
-- SECTION 6: ENABLE ROW LEVEL SECURITY
-- =====================================================================

ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- SECTION 7: DROP ALL EXISTING RLS POLICIES
-- =====================================================================
-- Clean slate approach to avoid conflicts and ensure consistency

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop all policies on chat_rooms
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_rooms'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.chat_rooms';
    RAISE NOTICE 'Dropped policy: % on chat_rooms', r.policyname;
  END LOOP;

  -- Drop all policies on chat_room_members
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_room_members'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.chat_room_members';
    RAISE NOTICE 'Dropped policy: % on chat_room_members', r.policyname;
  END LOOP;

  -- Drop all policies on room_members
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'room_members'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.room_members';
    RAISE NOTICE 'Dropped policy: % on room_members', r.policyname;
  END LOOP;

  -- Drop all policies on chat_messages
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_messages'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.chat_messages';
    RAISE NOTICE 'Dropped policy: % on chat_messages', r.policyname;
  END LOOP;
END $$;

-- =====================================================================
-- SECTION 8: CREATE NON-RECURSIVE RLS POLICIES
-- =====================================================================
-- These policies use helper functions to avoid infinite recursion

-- 8.1: CHAT_ROOMS POLICIES

-- Users can view rooms where they are members
CREATE POLICY chat_rooms_select_members
  ON public.chat_rooms FOR SELECT
  TO authenticated
  USING (
    (type = 'dm' AND public.user_is_room_member(id))
    OR
    (type = 'group' AND public.user_is_group_member(id))
  );

-- Users can create DM and group rooms
CREATE POLICY chat_rooms_insert_own
  ON public.chat_rooms FOR INSERT
  TO authenticated
  WITH CHECK (
    (type = 'dm' AND (created_by IS NULL OR created_by = auth.uid()))
    OR
    (type = 'group' AND created_by = auth.uid())
  );

-- 8.2: ROOM_MEMBERS (DM) POLICIES

-- Users can view room members if they are in the room
CREATE POLICY room_members_select_own
  ON public.room_members FOR SELECT
  TO authenticated
  USING (
    public.user_is_room_member(room_id)
    OR
    user_id = auth.uid()
  );

-- Users can add members to DM rooms (for creating new DMs)
CREATE POLICY room_members_insert_any
  ON public.room_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 8.3: CHAT_ROOM_MEMBERS (Group) POLICIES

-- Users can view group memberships if they are in the group
CREATE POLICY chat_room_members_select_own
  ON public.chat_room_members FOR SELECT
  TO authenticated
  USING (
    public.user_is_group_member(room_id)
    OR
    user_id = auth.uid()
  );

-- Users can request to join a group (pending status)
CREATE POLICY chat_room_members_insert_pending
  ON public.chat_room_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
    AND role = 'member'
  );

-- Admins can add members directly (approved status)
CREATE POLICY chat_room_members_insert_admin
  ON public.chat_room_members FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_is_group_admin(room_id)
    OR
    -- Group creators can add initial members within 5 minutes of creation
    EXISTS (
      SELECT 1 FROM public.chat_rooms
      WHERE chat_rooms.id = room_id
        AND chat_rooms.created_by = auth.uid()
        AND chat_rooms.created_at > now() - interval '5 minutes'
    )
  );

-- Admins can update member status and role
CREATE POLICY chat_room_members_update_admin
  ON public.chat_room_members FOR UPDATE
  TO authenticated
  USING (public.user_is_group_admin(room_id));

-- Users can remove themselves from groups
CREATE POLICY chat_room_members_delete_self
  ON public.chat_room_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    public.user_is_group_admin(room_id)
  );

-- 8.4: CHAT_MESSAGES POLICIES

-- Users can view messages in rooms where they are members
CREATE POLICY chat_messages_select_members
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (public.user_is_in_room(room_id));

-- Users can send messages to rooms where they are members
CREATE POLICY chat_messages_insert_members
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender = auth.uid()
    AND public.user_is_in_room(room_id)
  );

-- =====================================================================
-- SECTION 9: DATABASE FUNCTIONS FOR APPLICATION USE
-- =====================================================================

-- 9.1: Drop existing functions to recreate with correct logic
DROP FUNCTION IF EXISTS public.create_group_room(uuid, boolean, uuid[], text) CASCADE;
DROP FUNCTION IF EXISTS public.ensure_direct_conversation(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.open_or_create_dm(uuid) CASCADE;

-- 9.2: Create group room function
CREATE OR REPLACE FUNCTION public.create_group_room(
  p_creator uuid,
  p_is_private boolean DEFAULT false,
  p_member_ids uuid[] DEFAULT ARRAY[]::uuid[],
  p_name text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id uuid;
  v_uid uuid;
  v_trimmed_name text;
BEGIN
  -- Security check: creator must be current user
  IF p_creator IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'unauthorized: creator must match authenticated user';
  END IF;

  -- Validate name
  v_trimmed_name := TRIM(p_name);
  IF LENGTH(v_trimmed_name) < 2 THEN
    RAISE EXCEPTION 'name too short: group name must be at least 2 characters';
  END IF;

  -- Create room (unique constraint will prevent duplicates)
  BEGIN
    INSERT INTO chat_rooms (type, title, created_by)
    VALUES ('group', v_trimmed_name, p_creator)
    RETURNING id INTO v_room_id;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'duplicate: a group with this name already exists';
  END;

  -- Add creator as admin
  INSERT INTO chat_room_members (room_id, user_id, role, status, invited_by)
  VALUES (v_room_id, p_creator, 'admin', 'approved', p_creator);

  -- Add other members if provided (all auto-approved)
  IF p_member_ids IS NOT NULL AND array_length(p_member_ids, 1) > 0 THEN
    FOREACH v_uid IN ARRAY p_member_ids LOOP
      IF v_uid IS NOT NULL AND v_uid != p_creator THEN
        INSERT INTO chat_room_members (room_id, user_id, role, status, invited_by)
        VALUES (v_room_id, v_uid, 'member', 'approved', p_creator)
        ON CONFLICT (room_id, user_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  RETURN v_room_id;
END;
$$;

-- 9.3: Create or get DM conversation function (two-parameter version)
CREATE OR REPLACE FUNCTION public.ensure_direct_conversation(me uuid, partner uuid)
RETURNS TABLE(output_room_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id uuid;
BEGIN
  -- Security check
  IF me IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'unauthorized: me parameter must match authenticated user';
  END IF;

  IF partner IS NULL OR partner = me THEN
    RAISE EXCEPTION 'invalid partner: must be another user';
  END IF;

  -- Find existing DM room
  SELECT cr.id INTO v_room_id
  FROM chat_rooms cr
  WHERE cr.type = 'dm'
    AND EXISTS (
      SELECT 1 FROM room_members
      WHERE room_id = cr.id AND user_id = me
    )
    AND EXISTS (
      SELECT 1 FROM room_members
      WHERE room_id = cr.id AND user_id = partner
    )
  LIMIT 1;

  -- Create room if it doesn't exist
  IF v_room_id IS NULL THEN
    INSERT INTO chat_rooms (type, title, created_by)
    VALUES ('dm', 'Direct Message', me)
    RETURNING id INTO v_room_id;

    -- Add both users as members
    INSERT INTO room_members (room_id, user_id)
    VALUES
      (v_room_id, me),
      (v_room_id, partner);
  END IF;

  RETURN QUERY SELECT v_room_id;
END;
$$;

-- 9.4: Create or get DM conversation function (one-parameter version for backwards compatibility)
CREATE OR REPLACE FUNCTION public.open_or_create_dm(partner uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id uuid;
  me uuid;
BEGIN
  me := auth.uid();

  IF me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF partner IS NULL OR partner = me THEN
    RAISE EXCEPTION 'Invalid partner: must be another user';
  END IF;

  -- Find existing DM room
  SELECT cr.id INTO v_room_id
  FROM chat_rooms cr
  WHERE cr.type = 'dm'
    AND EXISTS (
      SELECT 1 FROM room_members
      WHERE room_id = cr.id AND user_id = me
    )
    AND EXISTS (
      SELECT 1 FROM room_members
      WHERE room_id = cr.id AND user_id = partner
    )
  LIMIT 1;

  -- Create room if it doesn't exist
  IF v_room_id IS NULL THEN
    INSERT INTO chat_rooms (type, title, created_by)
    VALUES ('dm', 'Direct Message', me)
    RETURNING id INTO v_room_id;

    -- Add both users as members
    INSERT INTO room_members (room_id, user_id)
    VALUES
      (v_room_id, me),
      (v_room_id, partner);
  END IF;

  RETURN v_room_id;
END;
$$;

-- =====================================================================
-- SECTION 10: GRANT PERMISSIONS
-- =====================================================================

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION public.user_is_room_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_group_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_in_room(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_group_admin(uuid) TO authenticated;

-- Grant execute permissions on application functions
GRANT EXECUTE ON FUNCTION public.create_group_room(uuid, boolean, uuid[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_direct_conversation(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_or_create_dm(uuid) TO authenticated;

-- =====================================================================
-- SECTION 11: DATA CLEANUP
-- =====================================================================

-- 11.1: Auto-approve all pending members (optional - remove if not desired)
UPDATE chat_room_members
SET status = 'approved'
WHERE status = 'pending';

-- 11.2: Remove orphaned chat_room_members (members of non-existent rooms)
DELETE FROM chat_room_members
WHERE room_id NOT IN (SELECT id FROM chat_rooms);

-- 11.3: Remove orphaned room_members (members of non-existent rooms)
DELETE FROM room_members
WHERE room_id NOT IN (SELECT id FROM chat_rooms);

-- 11.4: Remove orphaned messages (messages in non-existent rooms)
DELETE FROM chat_messages
WHERE room_id NOT IN (SELECT id FROM chat_rooms);

COMMIT;

-- =====================================================================
-- SECTION 12: VERIFICATION QUERIES
-- =====================================================================
-- Run these queries to verify the fix was applied correctly

-- 12.1: Verify foreign key points to correct table
SELECT
  'Foreign Key Check' as verification_type,
  tc.constraint_name,
  kcu.column_name as source_column,
  ccu.table_name as target_table,
  ccu.column_name as target_column,
  CASE
    WHEN ccu.table_name = 'chat_rooms' THEN 'PASS'
    ELSE 'FAIL'
  END as status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'chat_messages'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'room_id';

-- 12.2: Verify primary key exists on chat_messages
SELECT
  'Primary Key Check' as verification_type,
  constraint_name,
  'chat_messages' as table_name,
  CASE
    WHEN constraint_type = 'PRIMARY KEY' THEN 'PASS'
    ELSE 'FAIL'
  END as status
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name = 'chat_messages'
  AND constraint_type = 'PRIMARY KEY';

-- 12.3: Verify RLS is enabled
SELECT
  'RLS Check' as verification_type,
  tablename,
  CASE
    WHEN rowsecurity THEN 'ENABLED'
    ELSE 'DISABLED'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('chat_rooms', 'chat_room_members', 'room_members', 'chat_messages')
ORDER BY tablename;

-- 12.4: Count policies per table
SELECT
  'Policy Count' as verification_type,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('chat_rooms', 'chat_room_members', 'room_members', 'chat_messages')
GROUP BY tablename
ORDER BY tablename;

-- 12.5: Verify unique constraint on group rooms
SELECT
  'Unique Constraint Check' as verification_type,
  indexname,
  tablename,
  CASE
    WHEN indexdef LIKE '%UNIQUE%' THEN 'PASS'
    ELSE 'FAIL'
  END as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'chat_rooms'
  AND indexname = 'idx_chat_rooms_unique_group';

-- 12.6: Verify helper functions exist
SELECT
  'Helper Functions Check' as verification_type,
  proname as function_name,
  CASE
    WHEN prosecdef THEN 'SECURITY DEFINER'
    ELSE 'NOT SECURITY DEFINER'
  END as security_type,
  CASE
    WHEN prosecdef THEN 'PASS'
    ELSE 'FAIL'
  END as status
FROM pg_proc
WHERE proname IN (
  'user_is_room_member',
  'user_is_group_member',
  'user_is_in_room',
  'user_is_group_admin'
)
ORDER BY proname;

-- 12.7: Check for duplicate groups
SELECT
  'Duplicate Groups Check' as verification_type,
  title,
  created_by,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) = 1 THEN 'PASS'
    ELSE 'FAIL - DUPLICATES EXIST'
  END as status
FROM chat_rooms
WHERE type = 'group'
  AND title IS NOT NULL
  AND created_by IS NOT NULL
GROUP BY title, created_by
HAVING COUNT(*) > 1;

-- 12.8: Summary statistics
SELECT
  'Summary Statistics' as verification_type,
  (SELECT COUNT(*) FROM chat_rooms WHERE type = 'dm') as dm_rooms_count,
  (SELECT COUNT(*) FROM chat_rooms WHERE type = 'group') as group_rooms_count,
  (SELECT COUNT(*) FROM chat_room_members) as group_members_count,
  (SELECT COUNT(*) FROM room_members) as dm_members_count,
  (SELECT COUNT(*) FROM chat_messages) as messages_count;

-- =====================================================================
-- COMPLETION MESSAGE
-- =====================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'COMPREHENSIVE DATABASE SCHEMA FIX COMPLETED - October 14, 2025';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'FIXES APPLIED:';
  RAISE NOTICE '  1. Foreign key now points to chat_rooms (not rooms)';
  RAISE NOTICE '  2. Primary key confirmed on chat_messages';
  RAISE NOTICE '  3. RLS policies recreated without recursion';
  RAISE NOTICE '  4. Helper functions created to prevent infinite loops';
  RAISE NOTICE '  5. Unique constraints added to prevent duplicate groups';
  RAISE NOTICE '  6. Indexes created for performance';
  RAISE NOTICE '  7. Orphaned data cleaned up';
  RAISE NOTICE '  8. Application functions recreated with security checks';
  RAISE NOTICE '';
  RAISE NOTICE 'TABLES:';
  RAISE NOTICE '  - chat_rooms (DM and group rooms)';
  RAISE NOTICE '  - chat_room_members (group memberships)';
  RAISE NOTICE '  - room_members (DM memberships)';
  RAISE NOTICE '  - chat_messages (all messages)';
  RAISE NOTICE '';
  RAISE NOTICE 'FUNCTIONS:';
  RAISE NOTICE '  - create_group_room(creator, is_private, member_ids, name)';
  RAISE NOTICE '  - ensure_direct_conversation(me, partner)';
  RAISE NOTICE '  - open_or_create_dm(partner)';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '  1. Review verification query results above';
  RAISE NOTICE '  2. Test creating a group chat in the application';
  RAISE NOTICE '  3. Test sending messages in both DM and group chats';
  RAISE NOTICE '  4. Monitor for any 403 or 409 errors';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;
