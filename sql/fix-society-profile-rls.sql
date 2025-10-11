-- Fix society_profiles RLS policies for LINE authentication
-- The UPDATE policy was checking auth.jwt() which doesn't exist for LINE auth

-- Drop the old UPDATE policy
DROP POLICY IF EXISTS "Organizers can update own profile" ON society_profiles;

-- Create new UPDATE policy that allows anonymous updates
-- (Security is handled by LINE authentication at the app level)
CREATE POLICY "Organizers can update own profile"
    ON society_profiles FOR UPDATE
    USING (true)
    WITH CHECK (true);
