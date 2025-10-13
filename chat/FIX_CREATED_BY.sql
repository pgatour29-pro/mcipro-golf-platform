-- FIX: Add created_by to room creation
-- The rooms table has a NOT NULL constraint on created_by that we need to satisfy

DROP FUNCTION IF EXISTS public.ensure_direct_conversation(uuid, uuid);

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
    -- ✅ FIX: Include created_by column
    INSERT INTO public.rooms(kind, slug, created_by)
    VALUES ('dm', slug_val, me)
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

-- Grant permissions
REVOKE ALL ON FUNCTION public.ensure_direct_conversation(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_direct_conversation(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_direct_conversation(uuid, uuid) TO anon;

-- Verify
DO $$
BEGIN
  RAISE NOTICE '✅ RPC updated with created_by column';
  RAISE NOTICE '✅ Function signature: ensure_direct_conversation(me uuid, partner uuid)';
  RAISE NOTICE '✅ Now includes created_by = me in room creation';
END $$;
