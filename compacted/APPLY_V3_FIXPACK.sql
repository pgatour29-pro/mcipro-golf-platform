-- V3 Fix Pack - Complete replacement
-- Run as ONE command

DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.conversation_participants CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;
DROP FUNCTION IF EXISTS public.ensure_direct_conversation(uuid) CASCADE;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tables
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('dm','group')),
  slug text UNIQUE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
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
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_rooms_slug ON public.rooms (slug);
CREATE INDEX idx_cp_profile ON public.conversation_participants (profile_id);
CREATE INDEX idx_msgs_room_created ON public.chat_messages (room_id, created_at DESC);

-- RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rooms_select_if_participant" ON public.rooms;
CREATE POLICY "rooms_select_if_participant"
ON public.rooms
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.room_id = rooms.id AND cp.profile_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "rooms_insert_block" ON public.rooms;
CREATE POLICY "rooms_insert_block"
ON public.rooms
FOR INSERT
TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS "cp_select_if_self" ON public.conversation_participants;
CREATE POLICY "cp_select_if_self"
ON public.conversation_participants
FOR SELECT
USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "cp_insert_block" ON public.conversation_participants;
CREATE POLICY "cp_insert_block"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS "msgs_select_if_in_room" ON public.chat_messages;
CREATE POLICY "msgs_select_if_in_room"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.room_id = chat_messages.room_id AND cp.profile_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "msgs_insert_if_self_and_member" ON public.chat_messages;
CREATE POLICY "msgs_insert_if_self_and_member"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.room_id = chat_messages.room_id AND cp.profile_id = auth.uid()
  )
);

-- RPC
CREATE OR REPLACE FUNCTION public.ensure_direct_conversation(partner uuid)
RETURNS TABLE(room_id uuid, slug text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  a uuid;
  b uuid;
  dm_slug text;
  r_id uuid;
BEGIN
  IF partner IS NULL THEN
    RAISE EXCEPTION 'partner cannot be null';
  END IF;
  IF me IS NULL THEN
    RAISE EXCEPTION 'auth.uid() is null (are you authenticated?)';
  END IF;
  IF me = partner THEN
    RAISE EXCEPTION 'cannot create a DM with yourself';
  END IF;

  IF me::text < partner::text THEN
    a := me; b := partner;
  ELSE
    a := partner; b := me;
  END IF;
  dm_slug := 'dm:' || a::text || ':' || b::text;

  SELECT id INTO r_id FROM public.rooms WHERE slug = dm_slug LIMIT 1;
  IF r_id IS NULL THEN
    INSERT INTO public.rooms(kind, slug, created_by)
    VALUES ('dm', dm_slug, me)
    RETURNING id INTO r_id;

    INSERT INTO public.conversation_participants(room_id, profile_id)
    VALUES (r_id, a), (r_id, b)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN QUERY
  SELECT r_id, dm_slug;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_direct_conversation FROM public;
GRANT EXECUTE ON FUNCTION public.ensure_direct_conversation TO authenticated, anon;
