-- ============================================================================
-- FIND GILBERT'S REAL LINE USER ID
-- ============================================================================

-- Check all user_profiles entries that might be Gilbert
SELECT
    line_user_id,
    name,
    email,
    profile_data->'golfInfo'->>'handicap' as handicap,
    profile_data->'personalInfo'->>'email' as profile_email,
    created_at
FROM public.user_profiles
WHERE
    name ILIKE '%Gilbert%'
    OR name ILIKE '%Tristan%'
ORDER BY created_at DESC;

-- Check if Gilbert has any rounds saved (to find possible LINE IDs)
SELECT DISTINCT
    golfer_id,
    COUNT(*) as round_count,
    MAX(created_at) as last_round,
    STRING_AGG(DISTINCT course_name, ', ') as courses_played
FROM public.rounds
WHERE
    golfer_id LIKE '%Gilbert%'
    OR golfer_id LIKE '%Tristan%'
    OR golfer_id IN (
        SELECT line_user_id
        FROM public.user_profiles
        WHERE name ILIKE '%Gilbert%' OR name ILIKE '%Tristan%'
    )
GROUP BY golfer_id
ORDER BY last_round DESC;

-- Check society_members for Gilbert
SELECT
    golfer_id,
    society_id,
    status,
    joined_at
FROM public.society_members
WHERE
    golfer_id IN (
        SELECT line_user_id
        FROM public.user_profiles
        WHERE name ILIKE '%Gilbert%' OR name ILIKE '%Tristan%'
    );

-- Check event registrations
SELECT
    player_id,
    event_id,
    status,
    registered_at
FROM public.event_registrations
WHERE
    player_id IN (
        SELECT line_user_id
        FROM public.user_profiles
        WHERE name ILIKE '%Gilbert%' OR name ILIKE '%Tristan%'
    );

-- ============================================================================
-- This will help us find Gilbert's correct LINE user ID
-- ============================================================================
