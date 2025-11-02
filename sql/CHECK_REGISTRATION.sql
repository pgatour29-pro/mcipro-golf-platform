-- =====================================================
-- CHECK IF REGISTRATION EXISTS
-- =====================================================

-- Check all registrations (should see Pete's registration)
SELECT
    id,
    event_id,
    player_id,
    player_name,
    want_transport,
    want_competition,
    total_fee,
    payment_status,
    created_at
FROM event_registrations
ORDER BY created_at DESC
LIMIT 10;

-- Check specifically for Pete's LINE user ID
SELECT
    id,
    event_id,
    player_id,
    player_name,
    payment_status,
    created_at
FROM event_registrations
WHERE player_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- Check what RLS policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'event_registrations';

-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'event_registrations';
