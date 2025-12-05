-- Check if public games tables exist and their structure

-- 1. Check if side_game_pools table exists
SELECT
    'TABLE: side_game_pools' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'side_game_pools'
ORDER BY ordinal_position;

-- 2. Check if pool_entrants table exists
SELECT
    'TABLE: pool_entrants' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'pool_entrants'
ORDER BY ordinal_position;

-- 3. Count existing pools
SELECT
    'EXISTING POOLS' as info,
    COUNT(*) as total_pools,
    COUNT(CASE WHEN is_public = true THEN 1 END) as public_pools,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_pools
FROM public.side_game_pools;

-- 4. Show recent pools (last 7 days)
SELECT
    'RECENT POOLS (last 7 days)' as info,
    id,
    course_id,
    type,
    name,
    is_public,
    status,
    date_iso,
    created_at,
    (SELECT COUNT(*) FROM public.pool_entrants WHERE pool_id = side_game_pools.id) as entrant_count
FROM public.side_game_pools
WHERE date_iso::date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 20;

-- 5. Check pool entrants for recent pools
SELECT
    'POOL ENTRANTS (last 7 days)' as info,
    pe.pool_id,
    pe.player_id,
    pe.joined_at,
    pe.team_id,
    up.name as player_name
FROM public.pool_entrants pe
LEFT JOIN public.user_profiles up ON pe.player_id = up.line_user_id
WHERE pe.pool_id IN (
    SELECT id FROM public.side_game_pools
    WHERE date_iso::date >= CURRENT_DATE - INTERVAL '7 days'
)
ORDER BY pe.joined_at DESC
LIMIT 50;

-- 6. Check if RPC function exists
SELECT
    'RPC FUNCTION: update_live_progress' as info,
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'update_live_progress';
