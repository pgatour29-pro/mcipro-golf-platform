-- MciPro Chat Fix Pack - COMPLETE SOLUTION
-- Run this ENTIRE file as ONE command in Supabase SQL Editor

-- Drop existing tables (clean slate)
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.conversation_participants CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;

-- Create tables with proper structure
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('dm','group')),
  slug text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.conversation_participants (
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, profile_id)
);

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_rooms_slug ON public.rooms(slug);
CREATE INDEX idx_msgs_room_created ON public.chat_messages(room_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms, public.conversation_participants, public.chat_messages TO authenticated;

-- RLS Policies
DROP POLICY IF EXISTS cp_select ON public.conversation_participants;
CREATE POLICY cp_select ON public.conversation_participants
FOR SELECT TO authenticated
USING (profile_id = auth.uid());

DROP POLICY IF EXISTS cp_insert ON public.conversation_participants;
CREATE POLICY cp_insert ON public.conversation_participants
FOR INSERT TO authenticated
WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS rooms_select ON public.rooms;
CREATE POLICY rooms_select ON public.rooms
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.conversation_participants cp
  WHERE cp.room_id = rooms.id AND cp.profile_id = auth.uid()
));

DROP POLICY IF EXISTS rooms_insert ON public.rooms;
CREATE POLICY rooms_insert ON public.rooms
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS msgs_select ON public.chat_messages;
CREATE POLICY msgs_select ON public.chat_messages
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.conversation_participants cp
  WHERE cp.room_id = chat_messages.room_id AND cp.profile_id = auth.uid()
));

DROP POLICY IF EXISTS msgs_insert ON public.chat_messages;
CREATE POLICY msgs_insert ON public.chat_messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.room_id = chat_messages.room_id AND cp.profile_id = auth.uid()
  )
);

-- RPC Function
CREATE OR REPLACE FUNCTION public.ensure_direct_conversation(other_user uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  a uuid;
  b uuid;
  s text;
  r_id uuid;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'auth.uid() is null';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = caller) THEN
    RAISE EXCEPTION 'caller profile missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = other_user) THEN
    RAISE EXCEPTION 'other profile missing';
  END IF;

  IF caller < other_user THEN
    a := caller; b := other_user;
  ELSE
    a := other_user; b := caller;
  END IF;
  s := 'dm:' || a::text || ':' || b::text;

  SELECT id INTO r_id FROM public.rooms WHERE slug = s;
  IF r_id IS NULL THEN
    INSERT INTO public.rooms(kind, slug, created_by)
    VALUES ('dm', s, caller)
    RETURNING id INTO r_id;

    INSERT INTO public.conversation_participants(room_id, profile_id)
    VALUES (r_id, caller)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.conversation_participants(room_id, profile_id)
    VALUES (r_id, other_user)
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.conversation_participants(room_id, profile_id)
    VALUES (r_id, caller)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.conversation_participants(room_id, profile_id)
    VALUES (r_id, other_user)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN r_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_direct_conversation(uuid) TO authenticated;
