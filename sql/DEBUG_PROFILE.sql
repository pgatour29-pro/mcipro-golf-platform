-- Debug Pete's profile data

-- 1. What the function returns
SELECT get_player_profile('U2b6d976f19bca4b2f4374ae0e10ed873');

-- 2. Actual scorecards from Dec 1
SELECT course_name, DATE(started_at) as date, total_gross, total_net
FROM scorecards
WHERE player_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
  AND total_net >= 10
  AND DATE(started_at) >= '2025-12-01'
ORDER BY started_at DESC;

-- 3. Check society membership for Pete
SELECT sm.*, sp.society_name
FROM society_members sm
JOIN society_profiles sp ON sm.society_id = sp.id
WHERE sm.golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- 4. Check primary society
SELECT sp.society_name, sm.is_primary_society
FROM society_members sm
JOIN society_profiles sp ON sm.society_id = sp.id
WHERE sm.golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
  AND sm.is_primary_society = true;
