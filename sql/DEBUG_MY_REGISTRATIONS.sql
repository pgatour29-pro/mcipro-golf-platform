-- =====================================================
-- DEBUG: Check registrations query
-- =====================================================
-- This mimics what loadMyRegistrations() does

-- 1. Check all registrations for this user
SELECT
    'event_registrations' as table_name,
    *
FROM event_registrations
WHERE player_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
ORDER BY created_at DESC;

-- 2. Get the event details for those registrations
SELECT
    'society_events' as table_name,
    se.*
FROM society_events se
WHERE se.id IN (
    SELECT event_id
    FROM event_registrations
    WHERE player_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
);

-- 3. Check RLS status
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('event_registrations', 'society_events');
