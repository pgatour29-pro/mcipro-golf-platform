-- FIX ABBREVIATED COURSE NAMES
-- Update rounds with abbreviated course names to full names

-- Check for short course names
SELECT DISTINCT course_name, COUNT(*) as rounds_count
FROM rounds
WHERE LENGTH(course_name) < 20
GROUP BY course_name
ORDER BY rounds_count DESC;

-- Fix MT S -> Mountain Shadow Golf Club
UPDATE rounds
SET course_name = 'Mountain Shadow Golf Club'
WHERE course_name = 'MT S';

-- Fix Society Event placeholder with actual course names where possible
UPDATE rounds r
SET course_name = se.course_name
FROM scorecards sc, society_events se
WHERE r.course_name = 'Society Event'
  AND r.golfer_id = sc.player_id
  AND r.total_gross = sc.total_gross
  AND DATE(r.played_at) = DATE(sc.created_at)
  AND sc.event_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND se.id = sc.event_id::uuid
  AND se.course_name IS NOT NULL
  AND se.course_name != '';

-- Verify
SELECT DISTINCT course_name, COUNT(*) as rounds_count
FROM rounds
GROUP BY course_name
ORDER BY rounds_count DESC;
