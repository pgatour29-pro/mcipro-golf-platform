-- Simple handicap check without joins

-- Check user_profiles table
SELECT
    line_user_id,
    name,
    profile_data
FROM user_profiles
WHERE name ILIKE '%Alan Thomas%'
   OR name ILIKE '%Pete Park%'
   OR name ILIKE '%Park, Pete%'
   OR name ILIKE '%Thomas, Alan%';

-- Check all event_registrations for these players
SELECT
    player_name,
    player_id,
    handicap as registration_handicap,
    event_id,
    created_at
FROM event_registrations
WHERE player_name ILIKE '%Alan Thomas%'
   OR player_name ILIKE '%Pete Park%'
ORDER BY created_at DESC
LIMIT 10;
