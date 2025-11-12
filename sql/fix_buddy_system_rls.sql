-- ===========================================================================
-- FIX: Golf Buddies RLS Policies
-- ===========================================================================
-- ISSUE: RLS policies were using auth.uid() which is Supabase UUID
-- BUT: user_id field contains LINE user IDs (TEXT like "U044fd835...")
-- FIX: Disable RLS to allow client-side access with service key
-- ===========================================================================

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Users can view their own buddies" ON public.golf_buddies;
DROP POLICY IF EXISTS "Users can add their own buddies" ON public.golf_buddies;
DROP POLICY IF EXISTS "Users can update their own buddies" ON public.golf_buddies;
DROP POLICY IF EXISTS "Users can delete their own buddies" ON public.golf_buddies;
DROP POLICY IF EXISTS "Users can manage their own buddies" ON public.golf_buddies;
DROP POLICY IF EXISTS "Service role can manage all buddies" ON public.golf_buddies;

DROP POLICY IF EXISTS "Users can view their own groups" ON public.saved_groups;
DROP POLICY IF EXISTS "Users can create their own groups" ON public.saved_groups;
DROP POLICY IF EXISTS "Users can update their own groups" ON public.saved_groups;
DROP POLICY IF EXISTS "Users can delete their own groups" ON public.saved_groups;
DROP POLICY IF EXISTS "Users can manage their own groups" ON public.saved_groups;
DROP POLICY IF EXISTS "Service role can manage all groups" ON public.saved_groups;

-- Disable RLS (we're using service key in client with client-side filtering)
ALTER TABLE public.golf_buddies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_groups DISABLE ROW LEVEL SECURITY;

-- ===========================================================================
-- VERIFICATION
-- ===========================================================================
-- After running this, verify RLS is disabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('golf_buddies', 'saved_groups');
-- Both should show rowsecurity = false
-- ===========================================================================
