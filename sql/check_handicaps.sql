-- Check handicaps for Alan Thomas and Pete Park

-- Check user_profiles table
SELECT
    line_user_id,
    name,
    profile_data->>'handicap' as handicap_direct,
    profile_data->'golfInfo'->>'handicap' as handicap_golfinfo,
    created_at,
    updated_at
FROM user_profiles
WHERE name ILIKE '%Alan Thomas%'
   OR name ILIKE '%Pete Park%'
   OR name ILIKE '%Park, Pete%'
   OR name ILIKE '%Thomas, Alan%';

-- Check event_registrations for these players
SELECT
    er.player_name,
    er.player_id,
    er.handicap as registration_handicap,
    se.name as event_name,
    se.date as event_date
FROM event_registrations er
JOIN society_events se ON se.id = er.event_id
WHERE er.player_name ILIKE '%Alan Thomas%'
   OR er.player_name ILIKE '%Pete Park%'
ORDER BY se.date DESC
LIMIT 10;
