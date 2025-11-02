-- Test insert to see what error we get
-- This mimics what the Edge Function does

-- First, check what event IDs exist
SELECT id, name FROM society_events LIMIT 5;

-- Try inserting with the same structure as Edge Function
-- Replace the UUIDs below with actual values from your database
INSERT INTO event_registrations (
    id,
    event_id,
    player_id,
    player_name,
    handicap_index,
    want_transport,
    want_competition,
    total_fee,
    payment_status
) VALUES (
    gen_random_uuid(),
    -- Replace with actual event_id from query above
    '00000000-0000-0000-0000-000000000000',
    -- Replace with your user UUID
    '00000000-0000-0000-0000-000000000000',
    'Pete Park',
    2,
    true,
    true,
    5000,
    'unpaid'
);

-- This will show the actual database error
