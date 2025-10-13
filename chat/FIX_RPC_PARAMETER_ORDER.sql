-- =====================================================================
-- FIX: RPC parameter order (alphabetical for Supabase schema cache)
-- =====================================================================
-- Supabase expects parameters in alphabetical order when using named args
-- Client sends: p_creator, p_is_private, p_member_ids, p_name
-- =====================================================================

-- Drop old function (all variations)
DROP FUNCTION IF EXISTS create_group_room(uuid, text, uuid[], boolean);
DROP FUNCTION IF EXISTS create_group_room(text, uuid, uuid[]);

-- Create function with parameters in ALPHABETICAL order
CREATE OR REPLACE FUNCTION create_group_room(
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
BEGIN
  -- Validate creator
  IF p_creator IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'creator must equal auth.uid()';
  END IF;

  -- Validate name
  IF p_name IS NULL OR LENGTH(TRIM(p_name)) < 2 THEN
    RAISE EXCEPTION 'Group name must be at least 2 characters';
  END IF;

  RAISE NOTICE 'Creating group: % for creator: %', p_name, p_creator;

  -- Create the room
  INSERT INTO chat_rooms (type, title, created_by)
  VALUES ('group', p_name, p_creator)
  RETURNING id INTO v_room_id;

  RAISE NOTICE 'Room created with ID: %', v_room_id;

  -- Add creator as admin
  INSERT INTO chat_room_members (room_id, user_id, role, status, invited_by)
  VALUES (v_room_id, p_creator, 'admin', 'approved', p_creator);

  RAISE NOTICE 'Creator added as admin';

  -- Add members (pending)
  IF p_member_ids IS NOT NULL AND array_length(p_member_ids, 1) > 0 THEN
    FOREACH v_uid IN ARRAY p_member_ids LOOP
      IF v_uid IS NOT NULL AND v_uid IS DISTINCT FROM p_creator THEN
        INSERT INTO chat_room_members (room_id, user_id, role, status, invited_by)
        VALUES (v_room_id, v_uid, 'member', 'pending', p_creator)
        ON CONFLICT (room_id, user_id) DO NOTHING;
        RAISE NOTICE 'Member added: %', v_uid;
      END IF;
    END LOOP;
  END IF;

  RAISE NOTICE 'Group creation complete';
  RETURN v_room_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_group_room(uuid, boolean, uuid[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_group_room(uuid, boolean, uuid[], text) TO anon;

-- Verify function was created
SELECT
  'Function exists' as check_type,
  proname as function_name,
  prosecdef as is_security_definer,
  pg_get_function_arguments(oid) as parameters
FROM pg_proc
WHERE proname = 'create_group_room';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ RPC function created with correct parameter order';
  RAISE NOTICE '📋 Parameters (alphabetical): p_creator, p_is_private, p_member_ids, p_name';
  RAISE NOTICE '🔐 SECURITY DEFINER enabled (bypasses RLS)';
  RAISE NOTICE '========================================';
END $$;
