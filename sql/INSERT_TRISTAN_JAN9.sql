-- Insert Tristan Gilbert's round for January 9, 2026
-- Bangpakong Riverside Country Club, Blue Tees
-- Gross: 90, Stableford: 35 (with handicap 13.2)

-- First disable problematic triggers
ALTER TABLE rounds DISABLE TRIGGER IF EXISTS trigger_update_buddy_stats;
ALTER TABLE rounds DISABLE TRIGGER IF EXISTS trigger_auto_update_handicap;
ALTER TABLE rounds DISABLE TRIGGER IF EXISTS trigger_auto_update_society_handicaps;

-- Insert the round
INSERT INTO rounds (
  golfer_id,
  player_name,
  course_id,
  course_name,
  type,
  played_at,
  started_at,
  completed_at,
  status,
  total_gross,
  total_stableford,
  handicap_used,
  tee_marker,
  holes_played,
  course_rating,
  slope_rating,
  scoring_formats,
  format_scores
) VALUES (
  'U533f2301ff76d319e0086e8340e4051c',
  'Tristan Gilbert',
  'bangpakong',
  'Bangpakong Riverside Country Club',
  'private',
  '2026-01-09T10:00:00+07:00',
  '2026-01-09T10:00:00+07:00',
  '2026-01-09T14:30:00+07:00',
  'completed',
  90,
  35,
  13.2,
  'blue',
  18,
  72.0,
  130,
  ARRAY['stableford'],
  '{"stableford": 35}'::jsonb
);

-- Re-enable triggers
ALTER TABLE rounds ENABLE TRIGGER IF EXISTS trigger_update_buddy_stats;
ALTER TABLE rounds ENABLE TRIGGER IF EXISTS trigger_auto_update_handicap;
ALTER TABLE rounds ENABLE TRIGGER IF EXISTS trigger_auto_update_society_handicaps;

-- Verify
SELECT id, player_name, total_gross, total_stableford, played_at
FROM rounds
WHERE golfer_id = 'U533f2301ff76d319e0086e8340e4051c'
ORDER BY played_at DESC
LIMIT 3;
