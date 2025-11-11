-- =====================================================================
-- FIX PROFILE CREATION RLS POLICY - JWT CLAIM MISMATCH
-- =====================================================================
-- Issue: RLS policy checks wrong JWT claim causing 403 errors on mobile
-- Mobile devices cache JWT with 'sub' claim, but policy checks 'line_user_id'
-- Solution: Update policy to check BOTH claims for compatibility
-- =====================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can read their own profile" ON user_profiles;

-- Create new INSERT policy that checks both JWT claims
CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT
    WITH CHECK (
        line_user_id = COALESCE(
            (auth.jwt() -> 'line_user_id')::text,
            (auth.jwt() -> 'sub')::text,
            ''
        )
    );

-- Create new UPDATE policy that checks both JWT claims
CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE
    USING (
        line_user_id = COALESCE(
            (auth.jwt() -> 'line_user_id')::text,
            (auth.jwt() -> 'sub')::text,
            ''
        )
    );

-- Create new SELECT policy that checks both JWT claims
CREATE POLICY "Users can read their own profile" ON user_profiles
    FOR SELECT
    USING (
        line_user_id = COALESCE(
            (auth.jwt() -> 'line_user_id')::text,
            (auth.jwt() -> 'sub')::text,
            ''
        )
    );

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;
