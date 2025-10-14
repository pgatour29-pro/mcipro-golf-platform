-- =====================================================================
-- FIX: Enable room deletion for creators
-- Issue: Users cannot delete rooms they created (no DELETE policy)
-- =====================================================================

BEGIN;

-- Add DELETE policy for chat_rooms (creators can delete their own rooms)
DROP POLICY IF EXISTS chat_rooms_delete_creator ON public.chat_rooms;
CREATE POLICY chat_rooms_delete_creator
  ON public.chat_rooms FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Verify the policy was created
SELECT
  'DELETE Policy Check' as verification_type,
  tablename,
  policyname,
  cmd as command,
  'PASS' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'chat_rooms'
  AND cmd = 'DELETE';

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ DELETE policy created for chat_rooms';
  RAISE NOTICE '   - Creators can now delete their own rooms';
  RAISE NOTICE '   - CASCADE will remove members and messages';
END $$;
