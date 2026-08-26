-- Khao Kheow C nine — replaced from Pete's photo of the CURRENT card (2026-08-26).
-- Card in hand is the authority.
--   PAR  5,4,3,4,4,4,5,3,4  (Out 36)   <- we had 5,4,3,4,4,5,4,3,4: holes 6 & 7 SWAPPED
--   SI   4,6,16,18,12,8,2,14,10        <- already correct, restated for completeness
--   Yardages replaced on all four tees (every hole differed).
--   Card totals: yellow 3102, white 2841, red 2442 all reconcile exactly against the
--   per-hole values below. Blue's nine values sum to 3412 against a printed total read as
--   3472 — flagged to Pete; the per-hole blue figures are stored as read.
-- Runs as ONE transaction.

WITH card(hole, par, si, blue, yellow, white, red) AS (
    VALUES (1,5, 4,547,480,442,405),
           (2,4, 6,429,390,363,306),
           (3,3,16,179,164,138,107),
           (4,4,18,361,325,283,231),
           (5,4,12,389,376,337,301),
           (6,4, 8,420,385,371,299),
           (7,5, 2,552,487,444,405),
           (8,3,14,178,162,148,125),
           (9,4,10,357,333,315,263)
)
UPDATE course_holes ch
SET par          = c.par,
    stroke_index = c.si,
    yardage      = CASE lower(ch.tee_marker)
                       WHEN 'blue'   THEN c.blue
                       WHEN 'yellow' THEN c.yellow
                       WHEN 'white'  THEN c.white
                       WHEN 'red'    THEN c.red
                       ELSE ch.yardage
                   END
FROM card c
WHERE ch.course_id = 'khao_kheow_c'
  AND ch.hole_number = c.hole;

-- Today's TRGG event played C as the FRONT nine, so holes 6 and 7 of every card carried the
-- wrong par. Net and gross are unaffected (shots key off stroke index, which was right), but
-- the Stableford points on those two holes were wrong. Recompute them from the corrected pars.
WITH card(hole, par) AS (
    VALUES (1,5),(2,4),(3,3),(4,4),(5,4),(6,4),(7,5),(8,3),(9,4)
)
UPDATE round_holes rh
SET par = c.par,
    stableford_points = GREATEST(0, LEAST(5, 2 - ((rh.net_score) - c.par)))
FROM rounds r, card c
WHERE rh.round_id = r.id
  AND r.society_event_id = '5b615b05-7cbb-4bc4-9d29-60598fd4d08d'
  AND rh.hole_number = c.hole
  AND rh.gross_score IS NOT NULL;

-- Same correction on the live scorecards' per-hole rows (Billy's card + any others on this event).
WITH card(hole, par) AS (
    VALUES (1,5),(2,4),(3,3),(4,4),(5,4),(6,4),(7,5),(8,3),(9,4)
)
UPDATE scores s
SET par = c.par,
    stableford_points = GREATEST(0, LEAST(5, 2 - ((s.net_score) - c.par))),
    stableford        = GREATEST(0, LEAST(5, 2 - ((s.net_score) - c.par)))
FROM scorecards sc, card c
WHERE s.scorecard_id = sc.id::text
  AND sc.event_id = '5b615b05-7cbb-4bc4-9d29-60598fd4d08d'
  AND sc.course_name LIKE '%(C+A)%'
  AND s.hole_number = c.hole
  AND s.gross_score IS NOT NULL;

-- Re-total the stableford columns from the corrected holes.
UPDATE rounds r
SET total_stableford = t.p
FROM (
    SELECT rh.round_id, SUM(rh.stableford_points) p
    FROM round_holes rh
    JOIN rounds r2 ON r2.id = rh.round_id
    WHERE r2.society_event_id = '5b615b05-7cbb-4bc4-9d29-60598fd4d08d'
    GROUP BY rh.round_id
) t
WHERE r.id = t.round_id;
