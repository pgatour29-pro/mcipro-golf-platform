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
USING (created_by = auth.uid());

-- 2. Fix scorecards table policies (400 Bad Request errors)
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own scorecards" ON scorecards;
DROP POLICY IF EXISTS "Users can insert their own scorecards" ON scorecards;
DROP POLICY IF EXISTS "Users can update their own scorecards" ON scorecards;
DROP POLICY IF EXISTS "Users can view event scorecards" ON scorecards;

-- Enable RLS on scorecards
ALTER TABLE scorecards ENABLE ROW LEVEL SECURITY;

-- Allow users to view scorecards they're associated with
CREATE POLICY "Users can view their own scorecards"
ON scorecards
FOR SELECT
TO authenticated
USING (
    player_id = auth.uid()
    OR id IN (
        SELECT scorecard_id FROM scorecard_players WHERE line_user_id = auth.uid()
    )
);

-- Allow users to view event scorecards (for leaderboards)
CREATE POLICY "Users can view event scorecards"
ON scorecards
FOR SELECT
TO authenticated
USING (
    event_id IS NOT NULL
    AND event_id IN (
        SELECT event_id FROM event_registrations WHERE player_id = auth.uid()
    )
);

-- Allow users to insert scorecards
CREATE POLICY "Users can insert their own scorecards"
ON scorecards
FOR INSERT
TO authenticated
WITH CHECK (player_id = auth.uid());

-- Allow users to update their own scorecards
CREATE POLICY "Users can update their own scorecards"
ON scorecards
FOR UPDATE
TO authenticated
USING (
    player_id = auth.uid()
    OR id IN (
        SELECT scorecard_id FROM scorecard_players WHERE line_user_id = auth.uid()
    )
);

-- 3. Fix scores table policies (for score updates)
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view scores for their scorecards" ON scores;
DROP POLICY IF EXISTS "Users can insert scores" ON scores;
DROP POLICY IF EXISTS "Users can update scores" ON scores;

-- Enable RLS on scores
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Allow users to view scores for scorecards they have access to
CREATE POLICY "Users can view scores for their scorecards"
ON scores
FOR SELECT
TO authenticated
USING (
    scorecard_id IN (
        SELECT id FROM scorecards
        WHERE player_id = auth.uid()
        OR id IN (SELECT scorecard_id FROM scorecard_players WHERE line_user_id = auth.uid())
    )
);

-- Allow users to insert scores for their scorecards
CREATE POLICY "Users can insert scores"
ON scores
FOR INSERT
TO authenticated
WITH CHECK (
    scorecard_id IN (
        SELECT id FROM scorecards
        WHERE player_id = auth.uid()
        OR id IN (SELECT scorecard_id FROM scorecard_players WHERE line_user_id = auth.uid())
    )
);

-- Allow users to update scores for their scorecards
CREATE POLICY "Users can update scores"
ON scores
FOR UPDATE
TO authenticated
USING (
    scorecard_id IN (
        SELECT id FROM scorecards
        WHERE player_id = auth.uid()
        OR id IN (SELECT scorecard_id FROM scorecard_players WHERE line_user_id = auth.uid())
    )
);

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
