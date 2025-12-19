-- FIX ALL MISSING ROUNDS
-- Find all scorecards that don't have corresponding rounds and insert them
-- Date: 2025-12-14

-- First, see how many are missing
SELECT
    sc.player_id,
    sc.player_name,
    COUNT(*) as missing_rounds
FROM scorecards sc
WHERE sc.total_gross >= 50
  AND sc.player_id IS NOT NULL
  AND sc.player_id != ''
  AND NOT EXISTS (
    SELECT 1 FROM rounds r
    WHERE r.golfer_id = sc.player_id
    AND r.total_gross = sc.total_gross
    AND DATE(r.played_at) = DATE(sc.created_at)
  )
GROUP BY sc.player_id, sc.player_name
ORDER BY missing_rounds DESC;

-- Insert ALL missing rounds for ALL players
-- Skip the course name lookup entirely - just use 'Society Event' as placeholder
INSERT INTO rounds (golfer_id, course_name, total_gross, total_stableford, type, played_at)
SELECT
    sc.player_id as golfer_id,
    'Society Event' as course_name,
    sc.total_gross,
    (SELECT COALESCE(SUM(s.stableford_points), 0) FROM scores s WHERE s.scorecard_id = sc.id) as total_stableford,
    'society' as type,
    sc.created_at as played_at
FROM scorecards sc
WHERE sc.total_gross >= 50
  AND sc.player_id IS NOT NULL
  AND sc.player_id != ''
  AND NOT EXISTS (
    SELECT 1 FROM rounds r
    WHERE r.golfer_id = sc.player_id
    AND r.total_gross = sc.total_gross
    AND DATE(r.played_at) = DATE(sc.created_at)
  );

-- Now update the course names from society_events where we can
UPDATE rounds r
SET course_name = se.course_name
FROM scorecards sc, society_events se
WHERE r.course_name = 'Society Event'
  AND r.golfer_id = sc.player_id
  AND r.total_gross = sc.total_gross
  AND DATE(r.played_at) = DATE(sc.created_at)
  AND sc.event_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND se.id = sc.event_id::uuid;

-- Verify: Show players who now have rounds
SELECT
    golfer_id,
    COUNT(*) as total_rounds,
    ROUND(AVG(total_gross)::numeric, 1) as avg_gross
FROM rounds
WHERE total_gross >= 50
GROUP BY golfer_id
ORDER BY total_rounds DESC
LIMIT 20;
