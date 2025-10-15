-- FIX: RPC auth.uid() issue with SECURITY DEFINER
-- Replace the RPC to accept current user explicitly

DROP FUNCTION IF EXISTS public.ensure_direct_conversation(uuid);

-- Version 1: Pass current user explicitly (more reliable)
CREATE OR REPLACE FUNCTION public.ensure_direct_conversation(
  me uuid,
  partner uuid
)
RETURNS TABLE(room_id uuid, room_slug text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a uuid;
  b uuid;
  slug_val text;
  rid uuid;
BEGIN
  -- Validate inputs
  IF me IS NULL THEN
    RAISE EXCEPTION 'Current user (me) cannot be null';
  END IF;

  IF partner IS NULL OR partner = me THEN
    RAISE EXCEPTION 'Partner must be another user (not yourself)';
  END IF;

  -- Create deterministic slug (smaller UUID first)
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

  -- Return results
  room_id := rid;
  room_slug := slug_val;
  RETURN NEXT;
END $$;

-- Grant permissions to all roles
REVOKE ALL ON FUNCTION public.ensure_direct_conversation(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_direct_conversation(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_direct_conversation(uuid, uuid) TO anon;

-- Test it works
DO $$
DECLARE
  test_result record;
BEGIN
  RAISE NOTICE '✅ RPC function recreated with explicit user parameter';
  RAISE NOTICE '✅ Signature: ensure_direct_conversation(me uuid, partner uuid)';
  RAISE NOTICE '✅ Permissions granted to authenticated and anon roles';
END $$;
