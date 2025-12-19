-- MERGE BILLY SHEPLEY PROFILES
-- Guest: TRGG-GUEST-0908 (Shepley, Bill)
-- LINE:  U8e1e7241961a2747032dece7929adbde (Billy Shepley)
-- Both are the same person - merge guest data into LINE account

-- 1. Update scorecards to point to LINE user
UPDATE scorecards
SET player_id = 'U8e1e7241961a2747032dece7929adbde',
    player_name = 'Billy Shepley'
WHERE player_id = 'TRGG-GUEST-0908';

-- 2. Update rounds to point to LINE user
UPDATE rounds
SET golfer_id = 'U8e1e7241961a2747032dece7929adbde'
WHERE golfer_id = 'TRGG-GUEST-0908';

-- 3. Scores table doesn't have player_id - skip this step

-- 4. Update society_members to point to LINE user (avoid duplicate)
DELETE FROM society_members
WHERE golfer_id = 'TRGG-GUEST-0908'
  AND society_id IN (
    SELECT society_id FROM society_members WHERE golfer_id = 'U8e1e7241961a2747032dece7929adbde'
  );

UPDATE society_members
SET golfer_id = 'U8e1e7241961a2747032dece7929adbde'
WHERE golfer_id = 'TRGG-GUEST-0908';

-- 5. Delete the guest profile (data migrated)
DELETE FROM user_profiles
WHERE line_user_id = 'TRGG-GUEST-0908';

-- 6. Verify: Check Billy Shepley now has all rounds
SELECT
    r.golfer_id,
    r.course_name,
    r.total_gross,
    r.total_stableford,
    r.played_at
FROM rounds r
WHERE r.golfer_id = 'U8e1e7241961a2747032dece7929adbde'
ORDER BY r.played_at DESC;

-- 7. Verify profile
SELECT * FROM search_players_global('Billy Shepley', NULL, NULL, NULL, 10, 0);
