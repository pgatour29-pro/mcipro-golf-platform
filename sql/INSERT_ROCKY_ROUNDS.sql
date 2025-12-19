-- INSERT MISSING ROUNDS FOR ROCKY JONES
-- His scorecards exist but rounds were never saved
-- Rocky's LINE ID: U044fd835263fc6c0c596cf1d6c2414af

-- First check what we need to insert
SELECT
    sc.id as scorecard_id,
    sc.player_name,
    sc.total_gross,
    sc.total_net,
    sc.created_at,
    se.title as event_name,
    se.course_name
FROM scorecards sc
LEFT JOIN society_events se ON sc.event_id::uuid = se.id
WHERE sc.player_id = 'U044fd835263fc6c0c596cf1d6c2414af'
  AND sc.total_gross >= 50
ORDER BY sc.created_at DESC;

-- Insert the missing rounds
INSERT INTO rounds (golfer_id, course_name, total_gross, total_stableford, type, played_at)
SELECT
    'U044fd835263fc6c0c596cf1d6c2414af' as golfer_id,
    COALESCE(se.course_name, 'Unknown Course') as course_name,
    sc.total_gross,
    (SELECT COALESCE(SUM(s.stableford_points), 0) FROM scores s WHERE s.scorecard_id = sc.id) as total_stableford,
    'society' as type,
    sc.created_at as played_at
FROM scorecards sc
LEFT JOIN society_events se ON sc.event_id::uuid = se.id
WHERE sc.player_id = 'U044fd835263fc6c0c596cf1d6c2414af'
  AND sc.total_gross >= 50
  AND NOT EXISTS (
    SELECT 1 FROM rounds r
    WHERE r.golfer_id = 'U044fd835263fc6c0c596cf1d6c2414af'
    AND r.total_gross = sc.total_gross
    AND DATE(r.played_at) = DATE(sc.created_at)
  );

-- Verify
SELECT * FROM rounds
WHERE golfer_id = 'U044fd835263fc6c0c596cf1d6c2414af'
ORDER BY played_at DESC;
