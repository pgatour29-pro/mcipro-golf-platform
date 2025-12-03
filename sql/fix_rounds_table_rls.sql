-- Fix RLS policies for rounds table
-- This allows users to read/write ONLY their own rounds

-- 1. Enable RLS on rounds table
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can view their own rounds" ON rounds;
DROP POLICY IF EXISTS "Users can insert their own rounds" ON rounds;
DROP POLICY IF EXISTS "Users can update their own rounds" ON rounds;
DROP POLICY IF EXISTS "Users can delete their own rounds" ON rounds;

-- 3. Create new policies that allow all authenticated users
-- (assumes golfer_id is TEXT storing LINE user ID)

-- Allow users to view ONLY their own rounds
CREATE POLICY "Users can view their own rounds"
ON rounds FOR SELECT
TO authenticated
USING (golfer_id = auth.jwt() ->> 'sub');

-- Allow users to insert ONLY their own rounds
CREATE POLICY "Users can insert their own rounds"
ON rounds FOR INSERT
TO authenticated
WITH CHECK (golfer_id = auth.jwt() ->> 'sub');

-- Allow users to update ONLY their own rounds
CREATE POLICY "Users can update their own rounds"
ON rounds FOR UPDATE
TO authenticated
USING (golfer_id = auth.jwt() ->> 'sub')
WITH CHECK (golfer_id = auth.jwt() ->> 'sub');

-- Allow users to delete ONLY their own rounds
CREATE POLICY "Users can delete their own rounds"
ON rounds FOR DELETE
TO authenticated
USING (golfer_id = auth.jwt() ->> 'sub');

-- 4. Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'rounds';
