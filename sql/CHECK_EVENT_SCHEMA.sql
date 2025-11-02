-- Check the actual schema of society_events table
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'society_events'
ORDER BY ordinal_position;

-- Check if there are any existing events and what organizer_id values look like
SELECT
    id,
    name,
    organizer_id,
    organizer_name,
    date
FROM society_events
LIMIT 5;

-- Check Pete's user_id from user_profiles
SELECT
    line_user_id,
    name,
    role
FROM user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';
