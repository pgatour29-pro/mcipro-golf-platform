-- =============================================================================
-- FIX SIDE_GAME_POOLS ROW LEVEL SECURITY POLICIES (LINE AUTH VERSION)
-- =============================================================================
-- Date: 2025-12-02
-- Purpose: Allow authenticated users to create and join public game pools
-- Issue: Users getting 401 Unauthorized when creating public pools
-- Note: Using LINE user IDs stored in created_by column (not Supabase auth.uid)
-- =============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view public pools" ON side_game_pools;
DROP POLICY IF EXISTS "Users can create pools" ON side_game_pools;
DROP POLICY IF EXISTS "Users can update their own pools" ON side_game_pools;
DROP POLICY IF EXISTS "Users can delete their own pools" ON side_game_pools;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON side_game_pools;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON side_game_pools;
DROP POLICY IF EXISTS "Enable update for pool creators" ON side_game_pools;
DROP POLICY IF EXISTS "Enable delete for pool creators" ON side_game_pools;

-- Enable RLS
ALTER TABLE side_game_pools ENABLE ROW LEVEL SECURITY;

-- Policy 1: SELECT - All authenticated users can view public pools
CREATE POLICY "Enable read for authenticated users"
ON side_game_pools
FOR SELECT
TO authenticated
USING (true);  -- Allow all authenticated users to read

-- Policy 2: INSERT - All authenticated users can create pools
CREATE POLICY "Enable insert for authenticated users"
ON side_game_pools
FOR INSERT
TO authenticated
WITH CHECK (true);  -- Allow all authenticated users to insert

-- Policy 3: UPDATE - Users can update pools they created (using LINE user ID)
CREATE POLICY "Enable update for pool creators"
ON side_game_pools
FOR UPDATE
TO authenticated
USING (true)  -- Allow checking any row
WITH CHECK (true);  -- Allow updating (app validates ownership)

-- Policy 4: DELETE - Users can delete pools they created (using LINE user ID)
CREATE POLICY "Enable delete for pool creators"
ON side_game_pools
FOR DELETE
TO authenticated
USING (true);  -- Allow checking any row (app validates ownership)

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON side_game_pools TO authenticated;

-- Verify policies were created
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'side_game_pools'
ORDER BY policyname;

-- Show table permissions
SELECT
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'side_game_pools'
    AND grantee = 'authenticated';
