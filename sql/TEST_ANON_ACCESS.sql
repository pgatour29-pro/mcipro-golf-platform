-- Test if anon role can read event_registrations
SET ROLE anon;

SELECT
    id,
    event_id,
    player_id,
    player_name,
    status,
    created_at
FROM event_registrations
WHERE player_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
ORDER BY created_at DESC;

-- Reset role
RESET ROLE;

-- If the query above returns 0 rows, then RLS is blocking anonymous access
-- The Edge Function bypasses RLS (uses service role), but the frontend uses anon role
