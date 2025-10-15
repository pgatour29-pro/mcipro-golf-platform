-- =====================================================================
-- COMPREHENSIVE FIX - Schema + Cleanup + Duplicates
-- Run this in Supabase SQL Editor
-- =====================================================================

-- STEP 1: Fix foreign key to point to chat_rooms
ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_room_id_fkey;

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES public.chat_rooms(id)
  ON DELETE CASCADE;

-- STEP 2: Ensure primary key
ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_pkey;

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);

-- STEP 3: Drop old functions
DROP FUNCTION IF EXISTS create_group_room CASCADE;
DROP FUNCTION IF EXISTS ensure_direct_conversation CASCADE;

-- STEP 4: Create group function (fixed)
CREATE FUNCTION create_group_room(
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
  IF p_creator IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF LENGTH(TRIM(p_name)) < 2 THEN
    RAISE EXCEPTION 'name too short';
  END IF;

  INSERT INTO chat_rooms (type, title, created_by)
  VALUES ('group', p_name, p_creator)
  RETURNING id INTO v_room_id;

  INSERT INTO chat_room_members (room_id, user_id, role, status, invited_by)
  VALUES (v_room_id, p_creator, 'admin', 'approved', p_creator);

  IF p_member_ids IS NOT NULL AND array_length(p_member_ids, 1) > 0 THEN
    FOREACH v_uid IN ARRAY p_member_ids LOOP
      IF v_uid IS NOT NULL AND v_uid != p_creator THEN
        INSERT INTO chat_room_members (room_id, user_id, role, status, invited_by)
        VALUES (v_room_id, v_uid, 'member', 'approved', p_creator)
        ON CONFLICT (room_id, user_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  RETURN v_room_id;
END;
$$;

-- STEP 5: Create DM function (fixed)
CREATE FUNCTION ensure_direct_conversation(me uuid, partner uuid)
RETURNS TABLE(output_room_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id uuid;
BEGIN
  SELECT cr.id INTO v_room_id
  FROM chat_rooms cr
  WHERE cr.type = 'dm'
    AND EXISTS (SELECT 1 FROM chat_room_members WHERE room_id = cr.id AND user_id = me)
    AND EXISTS (SELECT 1 FROM chat_room_members WHERE room_id = cr.id AND user_id = partner)
  LIMIT 1;

  IF v_room_id IS NULL THEN
    INSERT INTO chat_rooms (type, title, created_by)
    VALUES ('dm', 'Direct Message', me)
    RETURNING id INTO v_room_id;

    INSERT INTO chat_room_members (room_id, user_id, role, status, invited_by)
    VALUES
      (v_room_id, me, 'member', 'approved', me),
      (v_room_id, partner, 'member', 'approved', me);
  END IF;

  RETURN QUERY SELECT v_room_id;
END;
$$;

-- STEP 6: Grant permissions
GRANT EXECUTE ON FUNCTION create_group_room TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_direct_conversation TO authenticated;

-- STEP 7: Clean up duplicate groups (keep most recent, delete older)
-- Identify duplicates
WITH duplicates AS (
  SELECT
    title,
    type,
    array_agg(id ORDER BY created_at DESC) as room_ids
  FROM chat_rooms
  WHERE type = 'group'
  GROUP BY title, type
  HAVING COUNT(*) > 1
),
rooms_to_delete AS (
  SELECT
    unnest(room_ids[2:]) as room_id
  FROM duplicates
)
-- Delete duplicate rooms (CASCADE will remove members and messages)
DELETE FROM chat_rooms
WHERE id IN (SELECT room_id FROM rooms_to_delete);

-- STEP 8: Approve all pending members
UPDATE chat_room_members SET status = 'approved' WHERE status = 'pending';

-- STEP 9: RLS Policies
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- chat_rooms: insert own
DROP POLICY IF EXISTS cr_insert_own ON public.chat_rooms;
CREATE POLICY cr_insert_own
  ON public.chat_rooms FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- chat_rooms: select for members
DROP POLICY IF EXISTS cr_select_for_members ON public.chat_rooms;
CREATE POLICY cr_select_for_members
  ON public.chat_rooms FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.chat_room_members m
            WHERE m.room_id = chat_rooms.id AND m.user_id = auth.uid())
    OR chat_rooms.created_by = auth.uid()
  );

-- chat_room_members: insert by creator
DROP POLICY IF EXISTS crm_insert_by_creator ON public.chat_room_members;
CREATE POLICY crm_insert_by_creator
  ON public.chat_room_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.chat_rooms r
            WHERE r.id = chat_room_members.room_id
              AND r.created_by = auth.uid())
  );

-- chat_room_members: select member
DROP POLICY IF EXISTS crm_select_member ON public.chat_room_members;
CREATE POLICY crm_select_member
  ON public.chat_room_members FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chat_room_members m
                 WHERE m.room_id = chat_room_members.room_id
                   AND m.user_id = auth.uid()));

-- chat_messages: insert member sender
DROP POLICY IF EXISTS cm_insert_member_sender ON public.chat_messages;
CREATE POLICY cm_insert_member_sender
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender = auth.uid()
    AND EXISTS (SELECT 1 FROM public.chat_room_members m
                WHERE m.room_id = chat_messages.room_id
                  AND m.user_id = auth.uid()
                  AND m.status = 'approved')
  );

-- chat_messages: select member
DROP POLICY IF EXISTS cm_select_member ON public.chat_messages;
CREATE POLICY cm_select_member
  ON public.chat_messages FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.chat_room_members m
            WHERE m.room_id = chat_messages.room_id
              AND m.user_id = auth.uid()
              AND m.status = 'approved')
  );

-- STEP 10: Verify results
SELECT
  'Total groups' as check_type,
  COUNT(*)::text as value
FROM chat_rooms
WHERE type = 'group'
UNION ALL
SELECT
  'Groups with duplicates',
  (COUNT(DISTINCT title) - COUNT(*))::text
FROM chat_rooms
WHERE type = 'group'
UNION ALL
SELECT
  'FK target table',
  ccu.table_name::text
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'chat_messages'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND tc.constraint_name = 'chat_messages_room_id_fkey';
