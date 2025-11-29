-- ============================================================================
-- FIX SOCIETIES AND EVENTS
-- ============================================================================
-- 1. Delete Ora Ora Golf society
-- 2. Check why events are showing as 0
-- 3. Fix event counts
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Show current state
-- ============================================================================

-- Show all societies
SELECT
    id,
    organizer_id,
    society_name,
    created_at
FROM public.society_profiles
ORDER BY society_name;

-- Show all events
SELECT
    id,
    name,
    date,
    society_id,
    organizer_id,
    organizer_name,
    creator_id,
    status
FROM public.society_events
ORDER BY date DESC
LIMIT 20;

-- ============================================================================
-- STEP 2: Delete Ora Ora Golf society
-- ============================================================================

DELETE FROM public.society_profiles
WHERE society_name = 'Ora Ora Golf';

RAISE NOTICE '✅ Deleted Ora Ora Golf society';

-- ============================================================================
-- STEP 3: Show events grouped by society
-- ============================================================================

-- Count events per society
SELECT
    sp.society_name,
    COUNT(se.id) as event_count
FROM public.society_profiles sp
LEFT JOIN public.society_events se ON se.society_id = sp.id
GROUP BY sp.id, sp.society_name
ORDER BY sp.society_name;

-- Show events by organizer_id (if society_id is null)
SELECT
    organizer_id,
    organizer_name,
    COUNT(*) as event_count
FROM public.society_events
WHERE society_id IS NULL
GROUP BY organizer_id, organizer_name;

-- ============================================================================
-- STEP 4: Check schema - is society_id column correct type?
-- ============================================================================

SELECT
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'society_events'
  AND column_name IN ('id', 'society_id', 'organizer_id', 'creator_id')
ORDER BY column_name;

COMMIT;

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================
-- 1. Ora Ora Golf deleted
-- 2. Only JOA Golf Pattaya and Travellers Rest Golf Group remain
-- 3. Event counts should be visible per society
-- ============================================================================
