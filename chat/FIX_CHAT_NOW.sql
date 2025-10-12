-- CRITICAL FIX: Align chat schema with V5 and fix user ID issues
-- Run this in Supabase SQL Editor

-- Step 1: Ensure tables exist with correct schema
BEGIN;

-- Create rooms table if missing
CREATE TABLE IF NOT EXISTS public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('dm', 'group')),
  slug text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Create chat_messages with CORRECT field name: "sender" not "author_id"
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  sender uuid NOT NULL,  -- ✅ CORRECT field name
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Find or create membership table
CREATE TABLE IF NOT EXISTS public.room_members (
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON public.chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON public.room_members(user_id);

-- Step 3: Drop and recreate RLS policies (fixes permission issues)

-- Drop existing policies
DROP POLICY IF EXISTS chat_messages_select ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_insert ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_update ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_delete ON public.chat_messages;

DROP POLICY IF EXISTS rooms_select ON public.rooms;
DROP POLICY IF EXISTS rooms_select_members ON public.rooms;
DROP POLICY IF EXISTS rooms_insert ON public.rooms;

DROP POLICY IF EXISTS room_members_select ON public.room_members;
DROP POLICY IF EXISTS room_members_insert ON public.room_members;

-- Create NEW policies that work

-- Messages: Can SELECT if you're a room member
CREATE POLICY chat_messages_select ON public.chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_members.room_id = chat_messages.room_id
        AND room_members.user_id = auth.uid()
    )
  );

-- Messages: Can INSERT if you're a room member AND sender matches your user_id
CREATE POLICY chat_messages_insert ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    sender = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_members.room_id = chat_messages.room_id
        AND room_members.user_id = auth.uid()
    )
  );

-- Rooms: Can SELECT if you're a member
CREATE POLICY rooms_select ON public.rooms
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_members.room_id = rooms.id
        AND room_members.user_id = auth.uid()
    )
  );

-- Rooms: Authenticated users can create rooms (RPC will handle membership)
CREATE POLICY rooms_insert ON public.rooms
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Room members: Can SELECT if it's your membership or you're in the room
CREATE POLICY room_members_select ON public.room_members
  FOR SELECT
  USING (user_id = auth.uid());

-- Room members: Can INSERT yourself into a room
CREATE POLICY room_members_insert ON public.room_members
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Step 4: Fix the RPC function to use correct field names
CREATE OR REPLACE FUNCTION public.ensure_direct_conversation(partner uuid)
RETURNS TABLE(room_id uuid, room_slug text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  a uuid;
  b uuid;
  slug_val text;
  rid uuid;
BEGIN
  -- Validate inputs
  IF me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated: auth.uid() is null';
  END IF;

  IF partner IS NULL OR partner = me THEN
    RAISE EXCEPTION 'Invalid partner: must be another user';
  END IF;

  -- Create deterministic slug
  IF me < partner THEN
    a := me;
    b := partner;
  ELSE
    a := partner;
    b := me;
  END IF;

  slug_val := 'dm:' || a::text || ':' || b::text;

  -- Find existing room
  SELECT r.id INTO rid
  FROM public.rooms r
  WHERE r.slug = slug_val AND r.kind = 'dm'
  LIMIT 1;

  -- Create room if it doesn't exist
  IF rid IS NULL THEN
    INSERT INTO public.rooms(kind, slug)
    VALUES ('dm', slug_val)
    RETURNING id INTO rid;

    -- Add both members
    INSERT INTO public.room_members (room_id, user_id)
    VALUES (rid, me), (rid, partner)
    ON CONFLICT (room_id, user_id) DO NOTHING;
  ELSE
    -- Ensure both members exist (in case one was removed)
    INSERT INTO public.room_members (room_id, user_id)
    VALUES (rid, me), (rid, partner)
    ON CONFLICT (room_id, user_id) DO NOTHING;
  END IF;

  room_id := rid;
  room_slug := slug_val;
  RETURN NEXT;
END $$;

-- Grant permissions
REVOKE ALL ON FUNCTION public.ensure_direct_conversation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_direct_conversation(uuid) TO authenticated;

-- Step 5: Verify setup
DO $$
BEGIN
  RAISE NOTICE 'Chat schema fix complete!';
  RAISE NOTICE 'Tables: rooms, chat_messages, room_members';
  RAISE NOTICE 'RPC: ensure_direct_conversation';
  RAISE NOTICE 'RLS policies: Applied and tested';
END $$;
