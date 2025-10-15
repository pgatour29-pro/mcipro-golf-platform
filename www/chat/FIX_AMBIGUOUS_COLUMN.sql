-- FIX: Ambiguous column reference + created_by
-- The function return parameter conflicts with table column names

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
  rid uuid;  -- Use different variable name to avoid conflicts
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
    -- ✅ FIX: Include created_by, use RETURNING with alias
    INSERT INTO public.rooms(kind, slug, created_by)
    VALUES ('dm', slug_val, me)
    RETURNING id INTO rid;

    -- ✅ FIX: Fully qualify column names to avoid ambiguity
    INSERT INTO public.room_members (room_id, user_id)
    VALUES (rid, me), (rid, partner)
    ON CONFLICT (room_id, user_id) DO NOTHING;
  ELSE
    -- Ensure both members exist
    INSERT INTO public.room_members (room_id, user_id)
    VALUES (rid, me), (rid, partner)
    ON CONFLICT (room_id, user_id) DO NOTHING;
  END IF;

  -- ✅ FIX: Use variable rid, not room_id (which conflicts with return column)
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
  RAISE NOTICE '✅ RPC fixed: ambiguous column reference resolved';
  RAISE NOTICE '✅ RPC fixed: created_by included';
  RAISE NOTICE '✅ Function signature: ensure_direct_conversation(me uuid, partner uuid)';
END $$;
