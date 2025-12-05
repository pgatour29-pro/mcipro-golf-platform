-- Debug why public pools aren't showing

-- 1. Check if ANY pools exist
SELECT
    'ALL POOLS' as info,
    id,
    course_id,
    event_id,
    date_iso,
    type,
    name,
    is_public,
    status,
    created_by,
    created_at
FROM public.side_game_pools
ORDER BY created_at DESC
LIMIT 20;

-- 2. Check pools created today
SELECT
    'TODAY POOLS' as info,
    id,
    course_id,
    event_id,
    date_iso,
    type,
    name,
    is_public,
    status,
    created_by,
    created_at
FROM public.side_game_pools
WHERE date_iso = CURRENT_DATE::text
ORDER BY created_at DESC;

-- 3. Check pools created in last 24 hours
SELECT
    'LAST 24H POOLS' as info,
    id,
    course_id,
    event_id,
    date_iso,
    type,
    name,
    is_public,
    status,
    created_at
FROM public.side_game_pools
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- 4. Check pool entrants
SELECT
    'POOL ENTRANTS' as info,
    pe.pool_id,
    sgp.name as pool_name,
    pe.player_id,
    up.name as player_name,
    pe.joined_at
FROM public.pool_entrants pe
LEFT JOIN public.side_game_pools sgp ON pe.pool_id = sgp.id
LEFT JOIN public.user_profiles up ON pe.player_id = up.line_user_id
WHERE pe.pool_id IN (
    SELECT id FROM public.side_game_pools
    WHERE created_at > NOW() - INTERVAL '24 hours'
)
ORDER BY pe.joined_at DESC;

-- 5. Check if side_game_pools table exists
SELECT
    'SIDE_GAME_POOLS TABLE' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'side_game_pools'
ORDER BY ordinal_position;

-- 6. Check RLS policies on side_game_pools
SELECT
    'RLS POLICIES' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'side_game_pools';
