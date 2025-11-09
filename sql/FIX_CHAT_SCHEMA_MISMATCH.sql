-- FIX CHAT SCHEMA MISMATCH
-- This drops existing chat tables and recreates them with correct schema
-- Safe to run because database is empty (no messages/rooms/members)

-- =============================================================================
-- STEP 1: Drop existing tables (CASCADE removes dependent objects)
-- =============================================================================

DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.chat_room_members CASCADE;
DROP TABLE IF EXISTS public.chat_rooms CASCADE;

-- =============================================================================
-- STEP 2: Create tables with correct schema
-- =============================================================================

-- Create chat_rooms table
CREATE TABLE public.chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('dm', 'group')) DEFAULT 'dm',
    title TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

-- Create chat_room_members table
CREATE TABLE public.chat_room_members (
    room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (room_id, user_id)
);

ALTER TABLE public.chat_room_members ENABLE ROW LEVEL SECURITY;

-- Create chat_messages table
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    sender UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_chat_messages_room_created
ON public.chat_messages(room_id, created_at DESC);

CREATE INDEX idx_chat_room_members_user
ON public.chat_room_members(user_id);

-- =============================================================================
-- STEP 3: Recreate the ensure_direct_conversation RPC Function
-- =============================================================================

DROP FUNCTION IF EXISTS public.ensure_direct_conversation(UUID);
DROP FUNCTION IF EXISTS public.ensure_direct_conversation(UUID, UUID);

CREATE OR REPLACE FUNCTION public.ensure_direct_conversation(
    me UUID,
    partner UUID
)
RETURNS TABLE(output_room_id UUID, output_room_slug TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_room_id UUID;
    v_room_slug TEXT;
    v_user_a UUID;
    v_user_b UUID;
BEGIN
    -- Validate inputs
    IF me IS NULL OR partner IS NULL THEN
        RAISE EXCEPTION 'Both me and partner parameters are required';
    END IF;

    IF me = partner THEN
        RAISE EXCEPTION 'Cannot create DM with yourself';
    END IF;

    -- Create deterministic slug (always smaller UUID first)
    IF me < partner THEN
        v_user_a := me;
        v_user_b := partner;
    ELSE
        v_user_a := partner;
        v_user_b := me;
    END IF;

    v_room_slug := 'dm:' || v_user_a::TEXT || ':' || v_user_b::TEXT;

    -- Try to find existing room
    SELECT cr.id INTO v_room_id
    FROM public.chat_rooms cr
    WHERE cr.type = 'dm'
      AND EXISTS (
          SELECT 1 FROM public.chat_room_members crm1
          WHERE crm1.room_id = cr.id AND crm1.user_id = me
      )
      AND EXISTS (
          SELECT 1 FROM public.chat_room_members crm2
          WHERE crm2.room_id = cr.id AND crm2.user_id = partner
      )
    LIMIT 1;

    -- If no existing room, create one
    IF v_room_id IS NULL THEN
        -- Create the room
        INSERT INTO public.chat_rooms (type, title, created_by)
        VALUES ('dm', v_room_slug, me)
        RETURNING id INTO v_room_id;

        -- Add both members
        INSERT INTO public.chat_room_members (room_id, user_id, status)
        VALUES
            (v_room_id, me, 'approved'),
            (v_room_id, partner, 'approved')
        ON CONFLICT (room_id, user_id) DO NOTHING;
    END IF;

    -- Return the room
    output_room_id := v_room_id;
    output_room_slug := v_room_slug;
    RETURN NEXT;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.ensure_direct_conversation(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_direct_conversation(UUID, UUID) TO anon;

-- =============================================================================
-- STEP 4: Set Up Row Level Security Policies
-- =============================================================================

-- DROP existing policies
DROP POLICY IF EXISTS chat_rooms_select ON public.chat_rooms;
DROP POLICY IF EXISTS chat_rooms_insert ON public.chat_rooms;
DROP POLICY IF EXISTS chat_room_members_select ON public.chat_room_members;
DROP POLICY IF EXISTS chat_room_members_insert ON public.chat_room_members;
DROP POLICY IF EXISTS chat_room_members_delete ON public.chat_room_members;
DROP POLICY IF EXISTS chat_messages_select ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_insert ON public.chat_messages;

-- CHAT_ROOMS policies: Users can see rooms they're members of
CREATE POLICY chat_rooms_select ON public.chat_rooms
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.chat_room_members crm
        WHERE crm.room_id = chat_rooms.id
          AND crm.user_id = auth.uid()
          AND crm.status = 'approved'
    )
);

-- Anyone authenticated can create rooms (RPC handles membership)
CREATE POLICY chat_rooms_insert ON public.chat_rooms
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- CHAT_ROOM_MEMBERS policies: Users can see their own memberships
-- (Simplified to avoid infinite recursion - use RPC functions to get room members)
CREATE POLICY chat_room_members_select ON public.chat_room_members
FOR SELECT USING (user_id = auth.uid());

-- Room members can be added by RPC
CREATE POLICY chat_room_members_insert ON public.chat_room_members
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can leave rooms
CREATE POLICY chat_room_members_delete ON public.chat_room_members
FOR DELETE USING (user_id = auth.uid());

-- CHAT_MESSAGES policies: Users can read messages in rooms they're members of
CREATE POLICY chat_messages_select ON public.chat_messages
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.chat_room_members crm
        WHERE crm.room_id = chat_messages.room_id
          AND crm.user_id = auth.uid()
          AND crm.status = 'approved'
    )
);

-- Users can send messages to rooms they're members of
CREATE POLICY chat_messages_insert ON public.chat_messages
FOR INSERT WITH CHECK (
    sender = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.chat_room_members crm
        WHERE crm.room_id = chat_messages.room_id
          AND crm.user_id = auth.uid()
          AND crm.status = 'approved'
    )
);

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Verify tables exist with correct schema
DO $$
BEGIN
    RAISE NOTICE '=== VERIFICATION ===';
    RAISE NOTICE 'chat_rooms table: % rows', (SELECT COUNT(*) FROM public.chat_rooms);
    RAISE NOTICE 'chat_room_members table: % rows', (SELECT COUNT(*) FROM public.chat_room_members);
    RAISE NOTICE 'chat_messages table: % rows', (SELECT COUNT(*) FROM public.chat_messages);
END $$;

-- Show chat_rooms columns
SELECT 'chat_rooms columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'chat_rooms'
ORDER BY ordinal_position;

-- Show RPC function signature
SELECT 'RPC function signature:' as info;
SELECT
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'ensure_direct_conversation';
