-- Fix for matchplay database errors (401 on side_game_pools, 400 on scorecards)
-- Date: 2025-12-02

-- 1. Fix RLS policies on side_game_pools table (401 Unauthorized errors)
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view active pools" ON side_game_pools;
DROP POLICY IF EXISTS "Users can create pools" ON side_game_pools;
DROP POLICY IF EXISTS "Pool creators can update their pools" ON side_game_pools;

-- Enable RLS on side_game_pools
ALTER TABLE side_game_pools ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view active pools
CREATE POLICY "Users can view active pools"
ON side_game_pools
FOR SELECT
TO authenticated
USING (status = 'active' OR status = 'completed');

-- Allow authenticated users to create pools
CREATE POLICY "Users can create pools"
ON side_game_pools
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to update pools they created
CREATE POLICY "Pool creators can update their pools"
ON side_game_pools
FOR UPDATE
TO authenticated
USING (created_by = auth.uid()::text);

-- 2. Fix scorecards table policies (400 Bad Request errors)
-- Drop existing policies
DROP POLICY IF EXISTS "Scorecards are viewable by everyone" ON scorecards;
DROP POLICY IF EXISTS "Scorecards are insertable by everyone" ON scorecards;
DROP POLICY IF EXISTS "Scorecards are updatable by everyone" ON scorecards;
DROP POLICY IF EXISTS "Scorecards are deletable by everyone" ON scorecards;

-- Enable RLS on scorecards
ALTER TABLE scorecards ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view any scorecard (for leaderboards)
CREATE POLICY "Authenticated users can view all scorecards"
ON scorecards
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert scorecards
CREATE POLICY "Authenticated users can insert scorecards"
ON scorecards
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update any scorecard (for live scoring in groups)
CREATE POLICY "Authenticated users can update all scorecards"
ON scorecards
FOR UPDATE
TO authenticated
USING (true);

-- 3. Fix scores table policies (for score updates)
-- Drop existing policies
DROP POLICY IF EXISTS "Scores are viewable by everyone" ON scores;
DROP POLICY IF EXISTS "Scores are insertable by everyone" ON scores;
DROP POLICY IF EXISTS "Scores are updatable by everyone" ON scores;
DROP POLICY IF EXISTS "Scores are deletable by everyone" ON scores;

-- Enable RLS on scores
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all scores (for leaderboards)
CREATE POLICY "Authenticated users can view all scores"
ON scores
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert scores
CREATE POLICY "Authenticated users can insert scores"
ON scores
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update scores (for live scoring)
CREATE POLICY "Authenticated users can update all scores"
ON scores
FOR UPDATE
TO authenticated
USING (true);

-- 4. Verify the fixes
SELECT
    'side_game_pools policies' as check_type,
    COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'side_game_pools'
UNION ALL
SELECT
    'scorecards policies',
    COUNT(*)
FROM pg_policies
WHERE tablename = 'scorecards'
UNION ALL
SELECT
    'scores policies',
    COUNT(*)
FROM pg_policies
WHERE tablename = 'scores';
