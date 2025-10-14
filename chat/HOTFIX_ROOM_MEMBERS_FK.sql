-- =====================================================================
-- HOTFIX: Fix room_members foreign key constraint
-- Issue: room_members.room_id still references "rooms" not "chat_rooms"
-- Error: Key (room_id)=(...) is not present in table "rooms"
-- =====================================================================

BEGIN;

-- Drop the wrong foreign key constraint on room_members
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT constraint_name
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'room_members'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%room_id%'
  ) LOOP
    EXECUTE 'ALTER TABLE public.room_members DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    RAISE NOTICE 'Dropped constraint: %', r.constraint_name;
  END LOOP;
END $$;

-- Add correct foreign key constraint pointing to chat_rooms
ALTER TABLE public.room_members
  ADD CONSTRAINT room_members_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES public.chat_rooms(id)
  ON DELETE CASCADE;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Fixed: room_members.room_id now points to chat_rooms';
END $$;

COMMIT;

-- Verify the fix
SELECT
  'Foreign Key Verification' as check_type,
  tc.constraint_name,
  kcu.column_name as source_column,
  ccu.table_name as target_table,
  CASE
    WHEN ccu.table_name = 'chat_rooms' THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'room_members'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'room_id';
