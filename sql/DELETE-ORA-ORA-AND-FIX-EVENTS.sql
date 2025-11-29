-- ============================================================================
-- DELETE ORA ORA GOLF AND FIX EVENT COUNTS
-- ============================================================================

BEGIN;

-- Step 1: Show current societies
SELECT
    id,
    organizer_id,
    society_name,
    created_at
FROM public.society_profiles
ORDER BY society_name;

-- Step 2: Count events per society BEFORE deletion
SELECT
    sp.society_name,
    sp.id as society_uuid,
    COUNT(se.id) as events_by_society_id,
    COUNT(CASE WHEN se.organizer_id = sp.organizer_id THEN 1 END) as events_by_organizer_id
FROM public.society_profiles sp
LEFT JOIN public.society_events se ON se.society_id = sp.id
GROUP BY sp.id, sp.society_name
ORDER BY sp.society_name;

-- Step 3: DELETE Ora Ora Golf
DELETE FROM public.society_profiles
WHERE society_name = 'Ora Ora Golf'
  OR organizer_id = '64aa0745-9e05-4f9f-9f22-373c9b29cf2d';

-- Step 4: Show remaining societies
SELECT
    id,
    organizer_id,
    society_name
FROM public.society_profiles
ORDER BY society_name;

-- Step 5: Check ALL events and their society_id values
SELECT
    id,
    name,
    date,
    society_id,
    organizer_id,
    organizer_name,
    status
FROM public.society_events
ORDER BY date DESC
LIMIT 50;

-- Step 6: Count events that have society_id vs those that don't
SELECT
    'Events WITH society_id' as status,
    COUNT(*) as count
FROM public.society_events
WHERE society_id IS NOT NULL

UNION ALL

SELECT
    'Events WITHOUT society_id' as status,
    COUNT(*) as count
FROM public.society_events
WHERE society_id IS NULL;

-- Step 7: Show events grouped by organizer_id (for events without society_id)
SELECT
    organizer_id,
    organizer_name,
    COUNT(*) as event_count,
    MIN(date) as earliest_event,
    MAX(date) as latest_event
FROM public.society_events
WHERE society_id IS NULL
GROUP BY organizer_id, organizer_name
ORDER BY event_count DESC;

COMMIT;

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================
-- 1. Ora Ora Golf deleted
-- 2. Only 2 societies remain: JOA Golf Pattaya, Travellers Rest Golf Group
-- 3. We'll see if events have society_id set or need to be linked by organizer_id
-- ============================================================================
