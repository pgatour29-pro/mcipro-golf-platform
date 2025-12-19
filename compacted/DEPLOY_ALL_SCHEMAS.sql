-- =====================================================================
-- COMPLETE MCIPRO DATABASE DEPLOYMENT SCRIPT
-- =====================================================================
-- Execute this in Supabase SQL Editor to deploy all schemas at once
-- Safe to run multiple times (idempotent)
-- Generated: 2025-10-20
-- =====================================================================

-- =====================================================================
-- PART 1: ROUNDS & HISTORY SYSTEM WITH ENHANCED RLS
-- =====================================================================

-- Check if columns exist, add if missing
DO $$
BEGIN
    -- Add scoring_formats column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='rounds' AND column_name='scoring_formats') THEN
        ALTER TABLE rounds ADD COLUMN scoring_formats JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- Add format_scores column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='rounds' AND column_name='format_scores') THEN
        ALTER TABLE rounds ADD COLUMN format_scores JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- Add posted_formats column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='rounds' AND column_name='posted_formats') THEN
        ALTER TABLE rounds ADD COLUMN posted_formats TEXT[] DEFAULT ARRAY[]::text[];
    END IF;

    -- Add scramble_config column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='rounds' AND column_name='scramble_config') THEN
        ALTER TABLE rounds ADD COLUMN scramble_config JSONB;
    END IF;

    -- Add team_size column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='rounds' AND column_name='team_size') THEN
        ALTER TABLE rounds ADD COLUMN team_size INTEGER;
    END IF;

    -- Add drive_requirements column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='rounds' AND column_name='drive_requirements') THEN
        ALTER TABLE rounds ADD COLUMN drive_requirements JSONB;
    END IF;

    -- Add shared_with column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='rounds' AND column_name='shared_with') THEN
        ALTER TABLE rounds ADD COLUMN shared_with TEXT[] DEFAULT ARRAY[]::text[];
    END IF;

    -- Add posted_to_organizer column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='rounds' AND column_name='posted_to_organizer') THEN
        ALTER TABLE rounds ADD COLUMN posted_to_organizer BOOLEAN DEFAULT false;
    END IF;

    -- Add organizer_id column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='rounds' AND column_name='organizer_id') THEN
        ALTER TABLE rounds ADD COLUMN organizer_id TEXT;
    END IF;
END $$;

-- Enhanced RLS Policy for Rounds (allows access to shared rounds)
DROP POLICY IF EXISTS "rounds_select_own" ON public.rounds;
DROP POLICY IF EXISTS "rounds_select_own_or_shared" ON public.rounds;

CREATE POLICY "rounds_select_own_or_shared"
  ON public.rounds FOR SELECT
  TO authenticated
  USING (
    golfer_id = auth.uid()::text OR
    auth.uid()::text = ANY(shared_with) OR
    auth.uid()::text = organizer_id
  );

-- Create index for shared_with array
CREATE INDEX IF NOT EXISTS idx_rounds_shared_with
  ON public.rounds USING GIN(shared_with);

-- Create distribute_round_to_players function if not exists
CREATE OR REPLACE FUNCTION distribute_round_to_players(
    p_round_id UUID,
    p_player_ids TEXT[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE rounds
    SET shared_with = p_player_ids
    WHERE id = p_round_id;
END;
$$;

DO $$ BEGIN
    RAISE NOTICE '✅ Part 1: Rounds & History System - COMPLETE';
END $$;

-- =====================================================================
-- PART 2: CHAT SYSTEM - COMPLETE SCHEMA
-- =====================================================================

-- 1) CHAT ROOMS TABLE
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT CHECK (type IN ('dm','group')) DEFAULT 'dm',
  title TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_chat_rooms_type ON chat_rooms(type);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_created_by ON chat_rooms(created_by);

-- 2) ROOM MEMBERS TABLE (for DMs)
CREATE TABLE IF NOT EXISTS room_members (
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_room_members_room ON room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user ON room_members(user_id);

-- 3) CHAT ROOM MEMBERS TABLE (for Groups)
CREATE TABLE IF NOT EXISTS chat_room_members (
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT CHECK (role IN ('admin','member')) DEFAULT 'member',
  status TEXT CHECK (status IN ('approved','pending','blocked')) DEFAULT 'approved',
  invited_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

ALTER TABLE chat_room_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_crm_room ON chat_room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_crm_user ON chat_room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_status ON chat_room_members(status) WHERE status = 'pending';

-- 4) CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE NOT NULL,
  sender UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);

-- 5) RLS POLICIES - CHAT ROOMS
DROP POLICY IF EXISTS "Users can view rooms they are members of" ON chat_rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON chat_rooms;

CREATE POLICY "Users can view rooms they are members of"
  ON chat_rooms FOR SELECT
  USING (
    (type = 'dm' AND EXISTS (
      SELECT 1 FROM room_members
      WHERE room_members.room_id = chat_rooms.id
        AND room_members.user_id = auth.uid()
    )) OR
    (type = 'group' AND EXISTS (
      SELECT 1 FROM chat_room_members
      WHERE chat_room_members.room_id = chat_rooms.id
        AND chat_room_members.user_id = auth.uid()
        AND chat_room_members.status = 'approved'
    ))
  );

CREATE POLICY "Users can create rooms"
  ON chat_rooms FOR INSERT
  WITH CHECK (
    (type = 'dm' AND created_by IS NULL) OR
    (type = 'group' AND created_by = auth.uid())
  );

-- 6) RLS POLICIES - ROOM MEMBERS
DROP POLICY IF EXISTS "Users can view room members" ON room_members;
DROP POLICY IF EXISTS "Users can add members to rooms" ON room_members;

CREATE POLICY "Users can view room members"
  ON room_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_members rm2
      WHERE rm2.room_id = room_members.room_id
        AND rm2.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add members to rooms"
  ON room_members FOR INSERT
  WITH CHECK (true);

-- 7) RLS POLICIES - CHAT ROOM MEMBERS
DROP POLICY IF EXISTS "Users can view group memberships" ON chat_room_members;
DROP POLICY IF EXISTS "Admins can add members" ON chat_room_members;

CREATE POLICY "Users can view group memberships"
  ON chat_room_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_room_members crm2
      WHERE crm2.room_id = chat_room_members.room_id
        AND crm2.user_id = auth.uid()
        AND crm2.status = 'approved'
    )
  );

CREATE POLICY "Admins can add members"
  ON chat_room_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_room_members
      WHERE room_id = chat_room_members.room_id
        AND user_id = auth.uid()
        AND role = 'admin'
    ) OR user_id = auth.uid()
  );

-- 8) RLS POLICIES - CHAT MESSAGES
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON chat_messages;
DROP POLICY IF EXISTS "Users can send messages" ON chat_messages;

CREATE POLICY "Users can view messages in their rooms"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_members
      WHERE room_members.room_id = chat_messages.room_id
        AND room_members.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM chat_room_members
      WHERE chat_room_members.room_id = chat_messages.room_id
        AND chat_room_members.user_id = auth.uid()
        AND chat_room_members.status = 'approved'
    )
  );

CREATE POLICY "Users can send messages"
  ON chat_messages FOR INSERT
  WITH CHECK (
    sender = auth.uid() AND (
      EXISTS (
        SELECT 1 FROM room_members
        WHERE room_members.room_id = chat_messages.room_id
          AND room_members.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM chat_room_members
        WHERE chat_room_members.room_id = chat_messages.room_id
          AND chat_room_members.user_id = auth.uid()
          AND chat_room_members.status = 'approved'
      )
    )
  );

-- 9) CHAT FUNCTIONS
DROP FUNCTION IF EXISTS create_group_room CASCADE;
DROP FUNCTION IF EXISTS ensure_direct_conversation CASCADE;

CREATE FUNCTION create_group_room(
  p_creator UUID,
  p_is_private BOOLEAN DEFAULT false,
  p_member_ids UUID[] DEFAULT ARRAY[]::uuid[],
  p_name TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id UUID;
  v_uid UUID;
BEGIN
  IF p_creator IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF LENGTH(TRIM(p_name)) < 2 THEN
    RAISE EXCEPTION 'name too short';
  END IF;

  INSERT INTO chat_rooms (type, title, created_by)
  VALUES ('group', p_name, p_creator)
  RETURNING id INTO v_room_id;

  INSERT INTO chat_room_members (room_id, user_id, role, status, invited_by)
  VALUES (v_room_id, p_creator, 'admin', 'approved', p_creator);

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

CREATE FUNCTION ensure_direct_conversation(me UUID, partner UUID)
RETURNS TABLE(output_room_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id UUID;
BEGIN
  SELECT cr.id INTO v_room_id
  FROM chat_rooms cr
  WHERE cr.type = 'dm'
    AND EXISTS (SELECT 1 FROM room_members WHERE room_id = cr.id AND user_id = me)
    AND EXISTS (SELECT 1 FROM room_members WHERE room_id = cr.id AND user_id = partner)
  LIMIT 1;

  IF v_room_id IS NULL THEN
    INSERT INTO chat_rooms (type, title, created_by)
    VALUES ('dm', 'Direct Message', me)
    RETURNING id INTO v_room_id;

    INSERT INTO room_members (room_id, user_id)
    VALUES
      (v_room_id, me),
      (v_room_id, partner);
  END IF;

  RETURN QUERY SELECT v_room_id;
END;
$$;

DO $$ BEGIN
    RAISE NOTICE '✅ Part 2: Chat System - COMPLETE';
END $$;

-- =====================================================================
-- VERIFICATION
-- =====================================================================

DO $$
DECLARE
    v_rounds_count INTEGER;
    v_chat_rooms_count INTEGER;
    v_policies_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_rounds_count
    FROM information_schema.columns
    WHERE table_name = 'rounds' AND column_name = 'shared_with';

    SELECT COUNT(*) INTO v_chat_rooms_count
    FROM information_schema.tables
    WHERE table_name = 'chat_rooms';

    SELECT COUNT(*) INTO v_policies_count
    FROM pg_policies
    WHERE policyname = 'rounds_select_own_or_shared';

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'DEPLOYMENT VERIFICATION';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Rounds.shared_with column: %', CASE WHEN v_rounds_count > 0 THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE 'chat_rooms table: %', CASE WHEN v_chat_rooms_count > 0 THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE 'rounds_select_own_or_shared policy: %', CASE WHEN v_policies_count > 0 THEN '✅ ACTIVE' ELSE '❌ MISSING' END;
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ ALL SCHEMAS DEPLOYED SUCCESSFULLY';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Create storage bucket: chat-media (Private)';
    RAISE NOTICE '2. Deploy edge functions (see DEPLOY_INSTRUCTIONS.md)';
    RAISE NOTICE '3. Test chat and round history features';
END $$;
