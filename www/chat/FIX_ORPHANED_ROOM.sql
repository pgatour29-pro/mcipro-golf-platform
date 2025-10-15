-- =====================================================================
-- FIX: Insert the orphaned room into chat_rooms so it works
-- =====================================================================

-- Check if room exists in chat_room_members (has membership data)
DO $$
DECLARE
  v_creator uuid;
  v_member_count int;
BEGIN
  -- Get the creator from memberships
  SELECT user_id INTO v_creator
  FROM chat_room_members
  WHERE room_id = '0ac2b06f-8c6c-49cb-96e1-a2b5f3d4479b'
    AND role = 'admin'
  LIMIT 1;

  -- Count members
  SELECT COUNT(*) INTO v_member_count
  FROM chat_room_members
  WHERE room_id = '0ac2b06f-8c6c-49cb-96e1-a2b5f3d4479b';

  IF v_creator IS NOT NULL THEN
    -- Insert the missing room
    INSERT INTO chat_rooms (id, type, title, created_by, created_at)
    VALUES (
      '0ac2b06f-8c6c-49cb-96e1-a2b5f3d4479b',
      'group',
      'Recovered Group',
      v_creator,
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE '✅ Room inserted into chat_rooms';
    RAISE NOTICE '👤 Creator: %', v_creator;
    RAISE NOTICE '👥 Members: %', v_member_count;
  ELSE
    RAISE NOTICE '⚠️ No membership data found - room cannot be recovered';
  END IF;
END $$;

-- Verify the room now exists
SELECT
  'Room now exists in chat_rooms' as status,
  id,
  type,
  title,
  created_by,
  created_at
FROM chat_rooms
WHERE id = '0ac2b06f-8c6c-49cb-96e1-a2b5f3d4479b';
