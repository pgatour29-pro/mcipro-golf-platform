-- =====================================================================
-- FIX: Infinite recursion in conversation_participants RLS policy
-- =====================================================================
-- The issue: The cp_select_member policy was querying conversation_participants
-- while defining a policy ON conversation_participants, causing infinite recursion.
--
-- Solution: Create a SECURITY DEFINER function that bypasses RLS checks
-- =====================================================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "cp_select_member" ON public.conversation_participants;

-- Create a helper function that bypasses RLS (SECURITY DEFINER)
-- This function checks if a user is a member of a conversation without triggering RLS
CREATE OR REPLACE FUNCTION public.user_is_conversation_member(conv_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conv_id
    AND user_id = auth.uid()
  );
$$;

-- Recreate the policy using the helper function
-- This prevents recursion because the function runs with elevated privileges
CREATE POLICY "cp_select_member" ON public.conversation_participants
  FOR SELECT USING (
    -- Users can always see their own participation record
    user_id = auth.uid()
    OR
    -- Users can see other participants if they're in the same conversation
    public.user_is_conversation_member(conversation_id)
  );

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.user_is_conversation_member(uuid) TO authenticated;

-- =====================================================================
-- END OF FIX
-- =====================================================================
