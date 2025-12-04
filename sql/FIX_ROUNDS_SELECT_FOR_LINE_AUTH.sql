-- ============================================================================
-- FIX ROUNDS SELECT POLICY FOR LINE AUTHENTICATION
-- ============================================================================
-- Problem: rounds_select_own_or_shared filters by auth.uid() (Supabase UUID)
-- But golfer_id stores LINE user IDs (text)
-- Solution: Allow authenticated users to see ALL rounds
-- ============================================================================

-- Drop the broken SELECT policy
DROP POLICY IF EXISTS "rounds_select_own_or_shared" ON public.rounds;

-- Create new policy that works with LINE authentication
-- Since rounds_all_operations already has qual=true for ALL operations,
-- we just need a simple SELECT policy for authenticated users
CREATE POLICY "rounds_select_all_authenticated"
ON public.rounds
FOR SELECT
TO authenticated
USING (true);

-- Also allow anon to select (for public leaderboards)
CREATE POLICY "rounds_select_all_anon"
ON public.rounds
FOR SELECT
TO anon
USING (true);

-- Verify policies
SELECT
    policyname,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'rounds'
ORDER BY policyname;

-- ============================================================================
-- NOTES:
-- - This allows all authenticated users to see all rounds
-- - This is safe because rounds_all_operations already allows this
-- - Now Round History should show Pete and Alan's rounds
-- ============================================================================
