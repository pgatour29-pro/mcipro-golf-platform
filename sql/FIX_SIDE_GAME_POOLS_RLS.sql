-- =============================================================================
-- FIX SIDE_GAME_POOLS ROW LEVEL SECURITY POLICIES
-- =============================================================================
-- Date: 2025-12-02
-- Purpose: Allow authenticated users to create and join public game pools
-- Issue: Users getting 401 Unauthorized when creating public pools
-- =============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view public pools" ON side_game_pools;
DROP POLICY IF EXISTS "Users can create pools" ON side_game_pools;
DROP POLICY IF EXISTS "Users can update their own pools" ON side_game_pools;
DROP POLICY IF EXISTS "Users can delete their own pools" ON side_game_pools;

-- Enable RLS
ALTER TABLE side_game_pools ENABLE ROW LEVEL SECURITY;

-- Policy 1: SELECT - Users can view all public pools on their course/date
CREATE POLICY "Users can view public pools"
ON side_game_pools
FOR SELECT
TO authenticated
USING (
    is_public = true
    OR created_by = auth.uid()::text
);

-- Policy 2: INSERT - Authenticated users can create pools
CREATE POLICY "Users can create pools"
ON side_game_pools
FOR INSERT
TO authenticated
WITH CHECK (
    created_by = auth.uid()::text
);

-- Policy 3: UPDATE - Users can update pools they created
CREATE POLICY "Users can update their own pools"
ON side_game_pools
FOR UPDATE
TO authenticated
USING (created_by = auth.uid()::text)
WITH CHECK (created_by = auth.uid()::text);

-- Policy 4: DELETE - Users can delete pools they created
CREATE POLICY "Users can delete their own pools"
ON side_game_pools
FOR DELETE
TO authenticated
USING (created_by = auth.uid()::text);

-- Verify policies were created
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'side_game_pools'
ORDER BY policyname;

-- Test query (should work for authenticated users)
-- SELECT * FROM side_game_pools WHERE is_public = true LIMIT 5;
