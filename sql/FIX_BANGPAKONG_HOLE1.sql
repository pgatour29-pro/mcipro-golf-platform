-- ============================================================================
-- FIX MISSING HOLE 1 SCORES - Bangpakong Dec 19, 2025
-- ============================================================================
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Pete Park: Hole 1, Gross 4, Par 4, SI 13, HCP 3 -> Net 4, Stableford 2
INSERT INTO scores (scorecard_id, hole_number, gross_score, net_score, par, stroke_index, stableford_points)
VALUES (
    '3cb1ff65-23a0-4c33-a357-4b844e1ddc34',
    1,
    4,  -- gross
    4,  -- net (SI 13 > HCP 3, no stroke)
    4,  -- par
    13, -- stroke index
    2   -- stableford (par = 2 pts)
);

-- Alan Thomas: Hole 1, Gross 5, Par 4, SI 13, HCP 11 -> Net 5, Stableford 1
INSERT INTO scores (scorecard_id, hole_number, gross_score, net_score, par, stroke_index, stableford_points)
VALUES (
    '39a7645c-b73e-4ca8-a12a-ab2ecf0a987f',
    1,
    5,  -- gross
    5,  -- net (SI 13 > HCP 11, no stroke)
    4,  -- par
    13, -- stroke index
    1   -- stableford (bogey = 1 pt)
);

-- Tristan Gilbert: Hole 1, Gross 5, Par 4, SI 13, HCP 12 -> Net 5, Stableford 1
INSERT INTO scores (scorecard_id, hole_number, gross_score, net_score, par, stroke_index, stableford_points)
VALUES (
    '2e015645-b046-403a-9a33-4592c8ebbaee',
    1,
    5,  -- gross
    5,  -- net (SI 13 > HCP 12, no stroke)
    4,  -- par
    13, -- stroke index
    1   -- stableford (bogey = 1 pt)
);

-- Verify the inserts
SELECT
    s.hole_number,
    s.gross_score,
    s.net_score,
    s.stableford_points,
    sc.player_name
FROM scores s
JOIN scorecards sc ON s.scorecard_id = sc.id
WHERE sc.event_id = 'bdf4c783-73f9-477d-958a-5b2aba80b041'
AND s.hole_number = 1
ORDER BY sc.player_name;

-- Update scorecard totals
UPDATE scorecards SET total_gross = 74 WHERE id = '3cb1ff65-23a0-4c33-a357-4b844e1ddc34'; -- Pete: 70 + 4 = 74
UPDATE scorecards SET total_gross = 80 WHERE id = '39a7645c-b73e-4ca8-a12a-ab2ecf0a987f'; -- Alan: 75 + 5 = 80
UPDATE scorecards SET total_gross = 94 WHERE id = '2e015645-b046-403a-9a33-4592c8ebbaee'; -- Tristan: 89 + 5 = 94

-- Show updated totals
SELECT
    sc.player_name,
    sc.handicap,
    COUNT(s.hole_number) as holes_played,
    SUM(s.gross_score) as total_gross,
    SUM(s.stableford_points) as total_stableford
FROM scorecards sc
LEFT JOIN scores s ON s.scorecard_id = sc.id
WHERE sc.event_id = 'bdf4c783-73f9-477d-958a-5b2aba80b041'
GROUP BY sc.id, sc.player_name, sc.handicap
ORDER BY total_stableford DESC;
