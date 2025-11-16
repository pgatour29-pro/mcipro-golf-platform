-- Fix Admin Access to User Database
-- This allows admin users to view all user profiles

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admin full access" ON user_profiles;

-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON user_profiles FOR SELECT
    USING (line_user_id = auth.jwt() ->> 'sub');

-- Policy 2: Admins can view ALL profiles
CREATE POLICY "Admin can view all profiles"
    ON user_profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE line_user_id = auth.jwt() ->> 'sub'
            AND role = 'admin'
        )
    );

-- Policy 3: Allow public read for basic profile info (for buddy search, leaderboards, etc)
CREATE POLICY "Public read for basic profile info"
    ON user_profiles FOR SELECT
    USING (true);

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'user_profiles';
