-- =====================================================
-- FIX PUBLIC POOL GUEST ACCESS
-- Allow guest users to join public pools without authentication
-- =====================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can join pools" ON public.pool_entrants;
DROP POLICY IF EXISTS "Users can leave pools" ON public.pool_entrants;

-- Create new flexible policies for public pools

-- Policy 1: Allow ANYONE to join public pools (authenticated or guest)
CREATE POLICY "Anyone can join public pools"
    ON public.pool_entrants
    FOR INSERT
    WITH CHECK (
        -- Either authenticated user joining their own entry
        (player_id = current_setting('request.jwt.claims', true)::json->>'line_user_id')
        OR
        -- Or guest user (player_id starts with 'guest_') joining a public pool
        (
            player_id LIKE 'guest_%'
            AND
            EXISTS (
                SELECT 1 FROM public.side_game_pools
                WHERE id = pool_id AND is_public = true
            )
        )
    );

-- Policy 2: Allow users to leave pools they joined (authenticated or guest)
CREATE POLICY "Anyone can leave their pool entries"
    ON public.pool_entrants
    FOR DELETE
    USING (
        -- Either authenticated user leaving their own entry
        (player_id = current_setting('request.jwt.claims', true)::json->>'line_user_id')
        OR
        -- Or any guest user can leave (we can't verify JWT for guests)
        (player_id LIKE 'guest_%')
    );

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
WHERE tablename = 'pool_entrants'
ORDER BY policyname;
