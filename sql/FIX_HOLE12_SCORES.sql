-- ============================================================================
-- FIX HOLE 12 SCORES - Bangpakong Dec 19, 2025
-- Alan Thomas and Tristan Gilbert both made PAR (5), not birdie/eagle
-- ============================================================================
-- Hole 12: Par 5, SI 10

-- Alan Thomas (HCP 11): Gets 1 stroke on SI 10
-- Gross 5 -> Net 4 (gets a stroke), Stableford = 3 pts (net birdie)
UPDATE scores
SET gross_score = 5,
    net_score = 4,
    stableford_points = 3
WHERE scorecard_id = '39a7645c-b73e-4ca8-a12a-ab2ecf0a987f'
AND hole_number = 12;

-- Gilbert, Tristan (HCP 12): Gets 1 stroke on SI 10
-- Gross 5 -> Net 4 (gets a stroke), Stableford = 3 pts (net birdie)
UPDATE scores
SET gross_score = 5,
    net_score = 4,
    stableford_points = 3
WHERE scorecard_id = '2e015645-b046-403a-9a33-4592c8ebbaee'
AND hole_number = 12;

-- Update scorecard totals
-- Alan: Was 80, hole 12 was 4, now 5 -> 80 + 1 = 81
UPDATE scorecards SET total_gross = 81 WHERE id = '39a7645c-b73e-4ca8-a12a-ab2ecf0a987f';

-- Tristan: Was 94, hole 12 was 3, now 5 -> 94 + 2 = 96
UPDATE scorecards SET total_gross = 96 WHERE id = '2e015645-b046-403a-9a33-4592c8ebbaee';

-- Verify the updates
SELECT
    sc.player_name,
    sc.total_gross,
    s.hole_number,
    s.gross_score,
    s.net_score,
    s.par,
    s.stableford_points
FROM scores s
JOIN scorecards sc ON s.scorecard_id = sc.id
WHERE sc.event_id = 'bdf4c783-73f9-477d-958a-5b2aba80b041'
AND s.hole_number = 12
ORDER BY sc.player_name;
