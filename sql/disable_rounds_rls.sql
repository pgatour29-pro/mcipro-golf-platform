-- Temporary fix: Disable RLS on rounds table completely
-- This allows all operations while we debug the proper policies

ALTER TABLE rounds DISABLE ROW LEVEL SECURITY;

-- Drop all policies to clean slate
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON rounds;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON rounds;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON rounds;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON rounds;
DROP POLICY IF EXISTS "Users can view their own rounds" ON rounds;
DROP POLICY IF EXISTS "Users can insert their own rounds" ON rounds;
DROP POLICY IF EXISTS "Users can update their own rounds" ON rounds;
DROP POLICY IF EXISTS "Users can delete their own rounds" ON rounds;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'rounds';
