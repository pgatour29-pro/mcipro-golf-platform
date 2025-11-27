-- Find Pete's UUID in the users table

SELECT id, line_user_id, username, email
FROM users
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- Also check the society_profiles to see the relationship
SELECT 
    sp.id as society_uuid,
    sp.organizer_id as organizer_text_id,
    sp.society_name,
    u.id as user_uuid,
    u.line_user_id,
    u.username
FROM society_profiles sp
LEFT JOIN users u ON u.line_user_id = sp.organizer_id
WHERE sp.organizer_id = 'trgg-pattaya' OR sp.society_name LIKE '%Travellers%';
