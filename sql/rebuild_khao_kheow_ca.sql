-- Rebuild the 2026-08-26 TRGG Khao Kheow Monthly Medal on the REAL C+A card.
-- The field was posted as (A+A): holes 1-9 carried the A nine's pars AND the A nine's stroke
-- indexes, which duplicated every odd index (A holds the odds, C the evens) and handed 16 of
-- 32 players extra shots. Verified from the scores themselves: hole 8 averaged 4.26 (A says
-- par 5 -> impossible; C says par 3), hole 1 averaged 6.90 (A par 4 -> absurd; C par 5).
-- Runs as ONE transaction: any error rolls the whole thing back.

-- 1) Billy's round_holes are stale from an earlier abandoned card (sums 85/80 vs his real
--    83/78). Resync the gross from his COMPLETED live C+A scorecard first.
UPDATE round_holes rh
SET gross_score = s.gross_score
FROM scores s
WHERE rh.round_id = '073df814-a338-4b10-8100-4bb4ac1bd1d4'
  AND s.scorecard_id = '2c716c6f-b07a-42db-b7af-c67f2a3caeee'
  AND s.hole_number = rh.hole_number
  AND rh.gross_score IS DISTINCT FROM s.gross_score;

-- 2) Stamp the true C+A card and recompute shots / net / points per hole.
--    C nine (holes 1-9):  par 5,4,3,4,4,5,4,3,4  SI 4,6,16,18,12,8,2,14,10
--    A nine (holes 10-18): par 4,5,3,4,3,4,4,5,4  SI 17,7,13,1,15,9,11,3,5
--    Allocation matches the app: php = ROUND(handicap_used) (Math.round, .5 away from zero),
--    shots = floor(php/18) + (SI <= php % 18 ? 1 : 0).
--    Stableford (kept in sync even though this is a medal): 2 - (net - par), clamped 0..5.
WITH card(hole_number, par, si) AS (
    VALUES (1,5,4),(2,4,6),(3,3,16),(4,4,18),(5,4,12),(6,5,8),(7,4,2),(8,3,14),(9,4,10),
           (10,4,17),(11,5,7),(12,3,13),(13,4,1),(14,3,15),(15,4,9),(16,4,11),(17,5,3),(18,4,5)
)
UPDATE round_holes rh
SET par              = c.par,
    stroke_index     = c.si,
    handicap_strokes = calc.shots,
    net_score        = rh.gross_score - calc.shots,
    stableford_points = GREATEST(0, LEAST(5, 2 - ((rh.gross_score - calc.shots) - c.par)))
FROM rounds r,
     card c,
     LATERAL (
        SELECT (ROUND(r.handicap_used)::int / 18)
             + CASE WHEN c.si <= (ROUND(r.handicap_used)::int % 18) THEN 1 ELSE 0 END AS shots
     ) calc
WHERE rh.round_id = r.id
  AND r.society_event_id = '5b615b05-7cbb-4bc4-9d29-60598fd4d08d'
  AND c.hole_number = rh.hole_number
  AND rh.gross_score IS NOT NULL;

-- 3) Re-total each round from its corrected holes, and correct the nines in the name.
UPDATE rounds r
SET total_gross      = t.g,
    total_net        = t.n,
    total_stableford = t.p,
    course_name      = 'Khao Kheow CC (C+A)'
FROM (
    SELECT rh.round_id,
           SUM(rh.gross_score) g,
           SUM(rh.net_score) n,
           SUM(rh.stableford_points) p
    FROM round_holes rh
    JOIN rounds r2 ON r2.id = rh.round_id
    WHERE r2.society_event_id = '5b615b05-7cbb-4bc4-9d29-60598fd4d08d'
    GROUP BY rh.round_id
) t
WHERE r.id = t.round_id;
