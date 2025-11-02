-- =============================================================================
-- ROUNDS/ROUND_HOLES RLS (Hardened - owner + shared + organizer)
-- -----------------------------------------------------------------------------
-- Requires: Clients write rounds with golfer_id = LINE user ID of the player,
--           and callers operate with a Supabase authenticated session where
--           auth.uid() matches golfer_id (i.e., user identity is bound).
--           Shared/organizer visibility via shared_with/organizer_id.
--
-- Apply this after the app is creating Supabase sessions for users.
-- =============================================================================

BEGIN;

ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_holes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS rounds_select_own ON public.rounds;
DROP POLICY IF EXISTS rounds_insert_own ON public.rounds;
DROP POLICY IF EXISTS rounds_update_own ON public.rounds;
DROP POLICY IF EXISTS rounds_delete_own ON public.rounds;
DROP POLICY IF EXISTS rounds_select_own_or_shared ON public.rounds;
DROP POLICY IF EXISTS rounds_select_all ON public.rounds;
DROP POLICY IF EXISTS rounds_insert_all ON public.rounds;
DROP POLICY IF EXISTS rounds_update_all ON public.rounds;
DROP POLICY IF EXISTS rounds_delete_all ON public.rounds;

DROP POLICY IF EXISTS round_holes_select_own ON public.round_holes;
DROP POLICY IF EXISTS round_holes_insert_own ON public.round_holes;
DROP POLICY IF EXISTS round_holes_update_own ON public.round_holes;
DROP POLICY IF EXISTS round_holes_delete_own ON public.round_holes;
DROP POLICY IF EXISTS round_holes_select_all ON public.round_holes;
DROP POLICY IF EXISTS round_holes_insert_all ON public.round_holes;
DROP POLICY IF EXISTS round_holes_update_all ON public.round_holes;
DROP POLICY IF EXISTS round_holes_delete_all ON public.round_holes;

-- rounds: SELECT owner + shared + organizer (authenticated only)
CREATE POLICY rounds_select_own_or_shared
  ON public.rounds FOR SELECT
  TO authenticated
  USING (
    golfer_id = auth.uid()::text OR
    auth.uid()::text = ANY(COALESCE(shared_with, ARRAY[]::text[])) OR
    auth.uid()::text = organizer_id
  );

-- rounds: INSERT only by owner (authenticated)
CREATE POLICY rounds_insert_own
  ON public.rounds FOR INSERT
  TO authenticated
  WITH CHECK (golfer_id = auth.uid()::text);

-- rounds: UPDATE only by owner (authenticated)
CREATE POLICY rounds_update_own
  ON public.rounds FOR UPDATE
  TO authenticated
  USING (golfer_id = auth.uid()::text);

-- rounds: DELETE only by owner (authenticated)
CREATE POLICY rounds_delete_own
  ON public.rounds FOR DELETE
  TO authenticated
  USING (golfer_id = auth.uid()::text);

-- round_holes: SELECT constrained to parent visibility (authenticated)
CREATE POLICY round_holes_select_own
  ON public.round_holes FOR SELECT
  TO authenticated
  USING (
    round_id IN (
      SELECT id FROM public.rounds
      WHERE golfer_id = auth.uid()::text
         OR auth.uid()::text = ANY(COALESCE(shared_with, ARRAY[]::text[]))
         OR auth.uid()::text = organizer_id
    )
  );

-- round_holes: INSERT constrained to parent ownership (authenticated)
CREATE POLICY round_holes_insert_own
  ON public.round_holes FOR INSERT
  TO authenticated
  WITH CHECK (
    round_id IN (
      SELECT id FROM public.rounds
      WHERE golfer_id = auth.uid()::text
    )
  );

-- round_holes: UPDATE constrained to parent ownership (authenticated)
CREATE POLICY round_holes_update_own
  ON public.round_holes FOR UPDATE
  TO authenticated
  USING (
    round_id IN (
      SELECT id FROM public.rounds
      WHERE golfer_id = auth.uid()::text
    )
  );

-- round_holes: DELETE constrained to parent ownership (authenticated)
CREATE POLICY round_holes_delete_own
  ON public.round_holes FOR DELETE
  TO authenticated
  USING (
    round_id IN (
      SELECT id FROM public.rounds
      WHERE golfer_id = auth.uid()::text
    )
  );

COMMIT;

-- Verify
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('rounds', 'round_holes')
ORDER BY tablename, cmd, policyname;

