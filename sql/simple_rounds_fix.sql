-- Simple fix: Allow all authenticated users to access rounds table
-- Rely on application-level filtering for security

-- 1. Enable RLS
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON rounds;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON rounds;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON rounds;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON rounds;

-- 3. Create permissive policies for all authenticated users
CREATE POLICY "Enable read access for all authenticated users"
ON rounds FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON rounds FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
ON rounds FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users"
ON rounds FOR DELETE
TO authenticated
USING (true);

-- NOTE: This is PERMISSIVE but relies on the application
-- to filter by golfer_id. More secure policies can be added later
-- once we confirm the authentication mapping works correctly.
