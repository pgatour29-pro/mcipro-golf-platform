-- First, check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'society_profiles';

-- Drop ALL existing policies on society_profiles to clean slate
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'society_profiles'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON society_profiles';
    END LOOP;
END $$;

-- Create fresh policies that work with LINE authentication (anonymous access)
-- SELECT - Everyone can see society profiles
CREATE POLICY "Allow public read access"
    ON society_profiles FOR SELECT
    USING (true);

-- INSERT - Anyone can create their profile
CREATE POLICY "Allow anonymous insert"
    ON society_profiles FOR INSERT
    WITH CHECK (true);

-- UPDATE - Anyone can update (LINE auth handles security at app level)
CREATE POLICY "Allow anonymous update"
    ON society_profiles FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- DELETE - Allow delete as well
CREATE POLICY "Allow anonymous delete"
    ON society_profiles FOR DELETE
    USING (true);

-- Verify the new policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'society_profiles';
