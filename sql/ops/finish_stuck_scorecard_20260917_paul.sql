-- 2026-09-17 ops — TRGG Phoenix: Paul Robertson scored all 18 holes but never tapped FINISH,
-- so his scorecard sat in_progress and kept the event live all afternoon.
-- This mirrors what the app's FINISH does (saveRoundToHistory + completeScorecard), by SQL:
--   1) rounds row anchored to the REAL scores rows (totals are SUMS, timings from score timestamps:
--      front9 = hole-9 score − start, back9 = last score − hole-9 score, total = last score − start);
--      the rounds INSERT fires the same triggers the app relies on (adopt_event, played_date,
--      auto_update_society_handicaps = THE handicap engine, buddy stats);
--   2) 18 round_holes copied from scores;
--   3) scorecard → completed, completed_at = last score time (naive UTC column).
-- Guards: only when all 18 holes exist and the card is still in_progress; -f runs as ONE
-- transaction so any failure rolls everything back. Check `rounds` for a same-day row FIRST.
-- To reuse: replace the scorecard id, golfer id, name, event/society ids, course_id (the app
-- stamps courseData.id — e.g. phoenix_mountain — not the card's base 'phoenix'), handicap_used
-- (= the society handicap the card was started with), course_rating/slope from a sibling row.
WITH agg AS (
  SELECT sum(gross_score)::int AS gross, sum(net_score)::int AS net, sum(stableford_points)::int AS pts,
         count(*)::int AS holes,
         min(created_at) FILTER (WHERE hole_number = 9)  AS h9_at,
         max(created_at) AS last_at
  FROM scores WHERE scorecard_id = 'abad0d31-749d-4573-8df2-2a93687710f3'
), card AS (
  SELECT started_at FROM scorecards WHERE id = 'abad0d31-749d-4573-8df2-2a93687710f3' AND status = 'in_progress'
), ins AS (
  INSERT INTO rounds (golfer_id, course_id, course_name, type, society_event_id, primary_society_id, organizer_id,
    played_at, started_at, completed_at, status, total_gross, total_net, total_stableford, handicap_used, tee_marker,
    course_rating, slope_rating, holes_played, scoring_formats, player_name, front9_seconds, back9_seconds, total_seconds,
    game_config, format_scores)
  SELECT 'U8874b596e11ee8fc7269f3a192f0da53', 'phoenix_mountain', 'Phoenix Gold Golf CC (Mountain+Lake)', 'society',
    '3ea672f6-3156-4893-be2d-b2d903344cff', '7c0e4b72-d925-44bc-afda-38259a7ba346', NULL,
    card.started_at AT TIME ZONE 'UTC', card.started_at AT TIME ZONE 'UTC', agg.last_at AT TIME ZONE 'UTC', 'completed',
    agg.gross, agg.net, agg.pts, 21.3, 'white',
    72, 113, agg.holes, '["stableford"]'::jsonb, 'Robertson, Paul',
    round(extract(epoch FROM (agg.h9_at - card.started_at)))::int,
    round(extract(epoch FROM (agg.last_at - agg.h9_at)))::int,
    round(extract(epoch FROM (agg.last_at - card.started_at)))::int,
    '{"formats":["stableford"],"points":{"stableford":{"overall":0}},"scramble":null}'::jsonb,
    jsonb_build_object('stableford', agg.pts)
  FROM agg, card
  WHERE agg.holes = 18
  RETURNING id
), rh AS (
  INSERT INTO round_holes (round_id, hole_number, par, stroke_index, gross_score, net_score, stableford_points, handicap_strokes)
  SELECT ins.id, s.hole_number, s.par, s.stroke_index, s.gross_score, s.net_score, s.stableford_points, s.handicap_strokes
  FROM ins, scores s WHERE s.scorecard_id = 'abad0d31-749d-4573-8df2-2a93687710f3'
  RETURNING round_id
), upd AS (
  UPDATE scorecards SET status = 'completed', completed_at = (SELECT last_at FROM agg), updated_at = (now() AT TIME ZONE 'UTC')
  WHERE id = 'abad0d31-749d-4573-8df2-2a93687710f3' AND status = 'in_progress' AND (SELECT count(*) FROM ins) = 1
  RETURNING id
)
SELECT (SELECT id FROM ins) AS round_id, (SELECT count(*) FROM rh) AS holes_written, (SELECT count(*) FROM upd) AS cards_completed;
