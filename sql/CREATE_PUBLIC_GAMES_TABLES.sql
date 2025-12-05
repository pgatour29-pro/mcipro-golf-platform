-- =====================================================
-- Create Public Games Tables (if not exists)
-- =====================================================

-- 1. Create side_game_pools table
CREATE TABLE IF NOT EXISTS public.side_game_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id TEXT NOT NULL,
    event_id UUID,
    date_iso TEXT NOT NULL,
    type TEXT NOT NULL, -- 'skins', 'matchplay', 'nassau', 'team_nassau', etc.
    name TEXT NOT NULL,
    is_public BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'active', -- 'active', 'completed', 'cancelled'
    config JSONB DEFAULT '{}'::jsonb,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create pool_entrants table
CREATE TABLE IF NOT EXISTS public.pool_entrants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id UUID NOT NULL REFERENCES public.side_game_pools(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL,
    team_id TEXT, -- For team games
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(pool_id, player_id)
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_side_game_pools_course_date
    ON public.side_game_pools(course_id, date_iso);
CREATE INDEX IF NOT EXISTS idx_side_game_pools_status
    ON public.side_game_pools(status);
CREATE INDEX IF NOT EXISTS idx_side_game_pools_public
    ON public.side_game_pools(is_public);
CREATE INDEX IF NOT EXISTS idx_pool_entrants_pool
    ON public.pool_entrants(pool_id);
CREATE INDEX IF NOT EXISTS idx_pool_entrants_player
    ON public.pool_entrants(player_id);

-- 4. Enable RLS
ALTER TABLE public.side_game_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_entrants ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies (if any)
DROP POLICY IF EXISTS "Allow all users to read public pools" ON public.side_game_pools;
DROP POLICY IF EXISTS "Allow authenticated users to create pools" ON public.side_game_pools;
DROP POLICY IF EXISTS "Allow pool creators to update their pools" ON public.side_game_pools;
DROP POLICY IF EXISTS "Allow all users to read pool entrants" ON public.pool_entrants;
DROP POLICY IF EXISTS "Allow authenticated users to join pools" ON public.pool_entrants;
DROP POLICY IF EXISTS "Allow users to leave pools" ON public.pool_entrants;

-- 6. Create RLS policies for side_game_pools
CREATE POLICY "Allow all users to read public pools"
    ON public.side_game_pools
    FOR SELECT
    USING (is_public = true OR created_by = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Allow authenticated users to create pools"
    ON public.side_game_pools
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow pool creators to update their pools"
    ON public.side_game_pools
    FOR UPDATE
    USING (created_by = current_setting('request.jwt.claims', true)::json->>'sub');

-- 7. Create RLS policies for pool_entrants
CREATE POLICY "Allow all users to read pool entrants"
    ON public.pool_entrants
    FOR SELECT
    USING (true);

CREATE POLICY "Allow authenticated users to join pools"
    ON public.pool_entrants
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow users to leave pools"
    ON public.pool_entrants
    FOR DELETE
    USING (player_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- 8. Create RPC function for updating live progress
CREATE OR REPLACE FUNCTION public.update_live_progress(
    p_pool_id UUID,
    p_player_id TEXT,
    p_hole INTEGER
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update logic here (placeholder)
    -- This function can be expanded to track player progress
    RAISE NOTICE 'Updated progress for player % in pool % at hole %', p_player_id, p_pool_id, p_hole;
END;
$$;

-- Verify tables were created
SELECT
    'VERIFICATION' as status,
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('side_game_pools', 'pool_entrants')
ORDER BY table_name;
