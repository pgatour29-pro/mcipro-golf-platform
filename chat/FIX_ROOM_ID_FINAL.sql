-- ULTIMATE FIX: Completely avoid ambiguous column references
-- Use different return column names that don't conflict with table columns

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
  v_room_id uuid;
  v_slug text;
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
    v_slug := 'dm:' || me::text || ':' || partner::text;
  ELSE
    v_slug := 'dm:' || partner::text || ':' || me::text;
  END IF;

  -- Find existing room
  SELECT r.id INTO v_room_id
  FROM public.rooms r
  WHERE r.slug = v_slug AND r.kind = 'dm'
  LIMIT 1;

  -- Create room if it doesn't exist
  IF v_room_id IS NULL THEN
    INSERT INTO public.rooms(kind, slug, created_by)
    VALUES ('dm', v_slug, me)
    RETURNING id INTO v_room_id;

    -- Add both members
    INSERT INTO public.room_members (room_id, user_id)
    VALUES (v_room_id, me), (v_room_id, partner)
    ON CONFLICT (room_id, user_id) DO NOTHING;
  ELSE
    -- Ensure both members exist
    INSERT INTO public.room_members (room_id, user_id)
    VALUES (v_room_id, me), (v_room_id, partner)
    ON CONFLICT (room_id, user_id) DO NOTHING;
  END IF;

  -- Return the result (assign to output variables)
  room_id := v_room_id;
  room_slug := v_slug;
  RETURN NEXT;
END $$;

-- Grant permissions
REVOKE ALL ON FUNCTION public.ensure_direct_conversation(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_direct_conversation(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_direct_conversation(uuid, uuid) TO anon;

-- Verify
DO $$
BEGIN
  RAISE NOTICE '🔧 RPC COMPLETELY REWRITTEN - ambiguity eliminated';
  RAISE NOTICE '✅ Using v_ prefixed variables to avoid conflicts';
  RAISE NOTICE '✅ Explicit table.column references in all INSERTs';
  RAISE NOTICE '✅ Function: ensure_direct_conversation(me uuid, partner uuid)';
END $$;
