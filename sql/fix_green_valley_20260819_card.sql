-- 2026-08-20: Fix TRGG Green Valley event 664536c2 (played 2026-08-19).
-- 18 Paper-Card-Entry rounds were scored against the WRONG course card: QSE loadCourseData's
-- naive substring name-matcher resolved event course_name "Green Valley Country Club" to
-- summit_green_valley_cm (Chiang Mai) instead of green_valley_rayong ("Rayong" sits mid-name,
-- so the contiguous-substring test failed on the right course and passed on the wrong one).
-- Pete Park's live-scored group carried the correct green_valley_rayong card.
-- This rewrites par/SI per hole, re-allocates handicap strokes against the correct SI,
-- recomputes net + stableford per hole and per round, stamps the correct course identity,
-- and removes Colin Johns' duplicate guest round (TRGG-GUEST-1145, unregistered, hole-identical
-- to his real round da1496d0).

-- 1) Rewrite round_holes to the Green Valley Rayong card (par/SI identical on all 4 tees).
--    php per round = total_gross - total_net (verified equal to round(handicap_used) on all 18).
WITH bad AS (
  SELECT r.id AS round_id, (r.total_gross - r.total_net)::int AS php
  FROM rounds r
  WHERE r.society_event_id = '664536c2-a81c-4da5-be75-a963ec3bdeb2'
    AND r.course_id IS NULL
),
card AS (
  SELECT hole_number, par, stroke_index
  FROM course_holes
  WHERE course_id = 'green_valley_rayong' AND tee_marker = 'blue'
)
UPDATE round_holes rh
SET par              = c.par,
    stroke_index     = c.stroke_index,
    handicap_strokes = (b.php / 18) + CASE WHEN c.stroke_index <= (b.php % 18) THEN 1 ELSE 0 END,
    net_score        = rh.gross_score - ((b.php / 18) + CASE WHEN c.stroke_index <= (b.php % 18) THEN 1 ELSE 0 END),
    stableford_points = LEAST(5, GREATEST(0,
        2 + c.par - (rh.gross_score - ((b.php / 18) + CASE WHEN c.stroke_index <= (b.php % 18) THEN 1 ELSE 0 END))))
FROM bad b, card c
WHERE rh.round_id = b.round_id
  AND rh.hole_number = c.hole_number;

-- 2) Re-sum round totals from the corrected holes + stamp correct course identity
--    (course_name must match the live group's rounds — it is the community-LB grouping key).
UPDATE rounds r
SET total_net        = s.net,
    total_stableford = s.pts,
    course_id        = 'green_valley_rayong',
    course_name      = 'Green Valley Rayong Country Club'
FROM (
  SELECT round_id, sum(net_score)::int AS net, sum(stableford_points)::int AS pts
  FROM round_holes
  GROUP BY round_id
) s
WHERE s.round_id = r.id
  AND r.society_event_id = '664536c2-a81c-4da5-be75-a963ec3bdeb2'
  AND r.course_id IS NULL;

-- 3) Remove Colin Johns duplicate guest round (verified hole-identical to da1496d0;
--    TRGG-GUEST-1145 has no registration for this event).
DELETE FROM round_holes WHERE round_id = '9573ae1f-8f93-4c73-aae2-1e538de5a3b4';
DELETE FROM rounds WHERE id = '9573ae1f-8f93-4c73-aae2-1e538de5a3b4' AND golfer_id = 'TRGG-GUEST-1145';
