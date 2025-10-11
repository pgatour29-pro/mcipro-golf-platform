-- =====================================================================
-- SIDE GAME POOLS - MULTI-GROUP LIVE COMPETITION
-- =====================================================================
-- Purpose: Allow multiple groups to compete in side games (Skins, Match Play, Nassau)
-- Date: 2025-10-11
-- =====================================================================
-- Features:
--   - Public/Private game pools
--   - Same course/day scoping
--   - Fairness cutoff (compare only common holes completed)
--   - Real-time leaderboard updates
--   - Opt-in per game type
-- =====================================================================

-- =====================================================================
-- 1. SIDE GAME POOLS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.side_game_pools (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Scope: identifies the "space" where pools are joinable
    course_id TEXT NOT NULL,              -- internal course ID (e.g., 'bangpakong', 'burapha_east')
    event_id TEXT,                        -- optional society event ID (null for private rounds)
    date_iso TEXT NOT NULL,               -- ISO date string (e.g., '2025-10-11')

    -- Game configuration
    type TEXT NOT NULL CHECK (type IN ('skins', 'matchplay', 'nassau')),
    name TEXT NOT NULL,                   -- e.g., "Saturday Skins - 10am"
    is_public BOOLEAN DEFAULT true,       -- if true, anyone in scope can join
    config JSONB DEFAULT '{}',            -- game-specific config (useNet, pairings, etc.)

    -- Metadata
    created_by TEXT NOT NULL,             -- LINE user ID of creator
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pools_scope ON public.side_game_pools(course_id, date_iso, event_id);
CREATE INDEX IF NOT EXISTS idx_pools_type ON public.side_game_pools(type);
CREATE INDEX IF NOT EXISTS idx_pools_status ON public.side_game_pools(status);
CREATE INDEX IF NOT EXISTS idx_pools_public ON public.side_game_pools(is_public) WHERE is_public = true;

-- Comments
COMMENT ON TABLE public.side_game_pools IS 'Public/private side game pools for multi-group competition';
COMMENT ON COLUMN public.side_game_pools.course_id IS 'Course identifier (must match for all entrants)';
COMMENT ON COLUMN public.side_game_pools.date_iso IS 'Date in ISO format (YYYY-MM-DD)';
COMMENT ON COLUMN public.side_game_pools.type IS 'Game type: skins, matchplay, or nassau';
COMMENT ON COLUMN public.side_game_pools.config IS 'JSON config: { useNet: boolean, pairings: [], pointsPerHole: number }';

-- =====================================================================
-- 2. POOL ENTRANTS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.pool_entrants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pool_id UUID NOT NULL REFERENCES public.side_game_pools(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL,              -- LINE user ID
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Optional: track which formats they selected if pool has multiple
    selected_formats TEXT[],              -- e.g., ['skins', 'nassau']

    -- Unique constraint: one player per pool
    UNIQUE(pool_id, player_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_entrants_pool ON public.pool_entrants(pool_id);
CREATE INDEX IF NOT EXISTS idx_entrants_player ON public.pool_entrants(player_id);

-- Comments
COMMENT ON TABLE public.pool_entrants IS 'Players who have joined a side game pool';
COMMENT ON COLUMN public.pool_entrants.selected_formats IS 'Optional: specific formats player opted into';

-- =====================================================================
-- 3. LIVE PROGRESS TRACKING
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.live_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pool_id UUID NOT NULL REFERENCES public.side_game_pools(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL,
    holes_completed INTEGER DEFAULT 0,    -- highest hole number with posted score
    last_hole_time TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(pool_id, player_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_progress_pool ON public.live_progress(pool_id);
CREATE INDEX IF NOT EXISTS idx_progress_player ON public.live_progress(player_id);

-- Comments
COMMENT ON TABLE public.live_progress IS 'Real-time tracking of holes completed per player in each pool';
COMMENT ON COLUMN public.live_progress.holes_completed IS 'Highest hole number with a posted score (1-18)';

-- =====================================================================
-- 4. POOL LEADERBOARD CACHE (OPTIONAL)
-- =====================================================================
-- Pre-computed leaderboard snapshots for performance
CREATE TABLE IF NOT EXISTS public.pool_leaderboards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pool_id UUID NOT NULL REFERENCES public.side_game_pools(id) ON DELETE CASCADE,
    cutoff_hole INTEGER NOT NULL,         -- fairness cutoff (min common hole)
    leaderboard_data JSONB NOT NULL,      -- computed standings
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(pool_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_leaderboard_pool ON public.pool_leaderboards(pool_id);

-- Comments
COMMENT ON TABLE public.pool_leaderboards IS 'Cached leaderboard calculations for quick retrieval';
COMMENT ON COLUMN public.pool_leaderboards.cutoff_hole IS 'Minimum common hole completed among all entrants';

-- =====================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================================

-- Enable RLS on all tables
ALTER TABLE public.side_game_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_entrants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_leaderboards ENABLE ROW LEVEL SECURITY;

-- Pools: anyone can view public pools in their scope
CREATE POLICY "Anyone can view public pools"
    ON public.side_game_pools FOR SELECT
    USING (is_public = true OR created_by = current_setting('request.jwt.claims', true)::json->>'line_user_id');

-- Pools: only creator can update/delete
CREATE POLICY "Creator can update pool"
    ON public.side_game_pools FOR UPDATE
    USING (created_by = current_setting('request.jwt.claims', true)::json->>'line_user_id');

CREATE POLICY "Creator can delete pool"
    ON public.side_game_pools FOR DELETE
    USING (created_by = current_setting('request.jwt.claims', true)::json->>'line_user_id');

-- Pools: authenticated users can create
CREATE POLICY "Authenticated users can create pools"
    ON public.side_game_pools FOR INSERT
    WITH CHECK (created_by = current_setting('request.jwt.claims', true)::json->>'line_user_id');

-- Entrants: users can join/leave pools
CREATE POLICY "Users can join pools"
    ON public.pool_entrants FOR INSERT
    WITH CHECK (player_id = current_setting('request.jwt.claims', true)::json->>'line_user_id');

CREATE POLICY "Users can leave pools"
    ON public.pool_entrants FOR DELETE
    USING (player_id = current_setting('request.jwt.claims', true)::json->>'line_user_id');

CREATE POLICY "Anyone can view entrants"
    ON public.pool_entrants FOR SELECT
    USING (true);

-- Progress: anyone can view, system updates
CREATE POLICY "Anyone can view progress"
    ON public.live_progress FOR SELECT
    USING (true);

CREATE POLICY "System can update progress"
    ON public.live_progress FOR ALL
    USING (true);

-- Leaderboards: anyone can view
CREATE POLICY "Anyone can view leaderboards"
    ON public.pool_leaderboards FOR SELECT
    USING (true);

CREATE POLICY "System can update leaderboards"
    ON public.pool_leaderboards FOR ALL
    USING (true);

-- =====================================================================
-- 6. HELPER FUNCTIONS
-- =====================================================================

-- Function to get common cutoff hole for a pool
CREATE OR REPLACE FUNCTION get_pool_cutoff_hole(pool_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    min_hole INTEGER;
BEGIN
    SELECT MIN(holes_completed) INTO min_hole
    FROM public.live_progress
    WHERE pool_id = pool_uuid;

    RETURN COALESCE(min_hole, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to update progress when score is posted
CREATE OR REPLACE FUNCTION update_live_progress(
    p_pool_id UUID,
    p_player_id TEXT,
    p_hole INTEGER
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.live_progress (pool_id, player_id, holes_completed, last_hole_time)
    VALUES (p_pool_id, p_player_id, p_hole, NOW())
    ON CONFLICT (pool_id, player_id)
    DO UPDATE SET
        holes_completed = GREATEST(public.live_progress.holes_completed, p_hole),
        last_hole_time = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger to update pool updated_at
CREATE OR REPLACE FUNCTION update_pool_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.side_game_pools
    SET updated_at = NOW()
    WHERE id = NEW.pool_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pool_on_entrant_change
    AFTER INSERT OR DELETE ON public.pool_entrants
    FOR EACH ROW
    EXECUTE FUNCTION update_pool_timestamp();

-- =====================================================================
-- 7. VERIFICATION QUERIES
-- =====================================================================

-- Verify tables
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('side_game_pools', 'pool_entrants', 'live_progress', 'pool_leaderboards');

-- Verify RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('side_game_pools', 'pool_entrants', 'live_progress', 'pool_leaderboards');

-- =====================================================================
-- 8. EXAMPLE: CREATE A PUBLIC SKINS POOL
-- =====================================================================

/*
-- Create a public skins game at Bangpakong on October 11, 2025
INSERT INTO public.side_game_pools (
    course_id, event_id, date_iso, type, name, is_public, config, created_by
)
VALUES (
    'bangpakong',
    NULL,
    '2025-10-11',
    'skins',
    'Saturday Morning Skins - 100 pts/hole',
    true,
    '{"useNet": true, "pointsPerHole": 100, "carryOver": true}',
    'YOUR_LINE_USER_ID'
);

-- Join the pool
INSERT INTO public.pool_entrants (pool_id, player_id)
VALUES (
    'POOL_UUID_FROM_ABOVE',
    'YOUR_LINE_USER_ID'
);
*/

-- =====================================================================
-- INSTRUCTIONS:
-- =====================================================================
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Verify all 4 tables were created
-- 3. Test by creating a sample pool (see example above)
-- 4. Hard refresh app (Ctrl+Shift+R)
-- 5. Navigate to Live Scorecard to see new "Public Games" option
-- =====================================================================
