-- =====================================================================
-- FIX DEC 17 ROYAL LAKESIDE - CREATE MISSING ROUNDS
-- =====================================================================
-- Event: TRGG - ROYAL LAKESIDE (2-WAY) - 33e609fc-a418-4e93-b539-ff85f2919cc3
-- Pete's round exists, 4 others are missing
-- =====================================================================

-- =====================================================================
-- STEP 1: INSERT MISSING ROUNDS
-- =====================================================================

-- Jimmy (player_1765947017451) - gross: 91, hcp: 13
INSERT INTO rounds (
    golfer_id, player_name, course_id, course_name, type, society_event_id,
    started_at, completed_at, status, total_gross, total_net, handicap_used, tee_marker
) VALUES (
    'player_1765947017451', 'Jimmy', 'royal_lakeside', 'Royal Lakeside Golf Club',
    'society', '33e609fc-a418-4e93-b539-ff85f2919cc3',
    '2025-12-17T04:50:19.427', NOW(), 'completed', 91, 78, 13, 'white'
) ON CONFLICT DO NOTHING
RETURNING id;

-- Tristan Gilbert (U533f2301ff76d319e0086e8340e4051c) - gross: 97, hcp: 12
INSERT INTO rounds (
    golfer_id, player_name, course_id, course_name, type, society_event_id,
    started_at, completed_at, status, total_gross, total_net, handicap_used, tee_marker
) VALUES (
    'U533f2301ff76d319e0086e8340e4051c', 'Gilbert, Tristan', 'royal_lakeside', 'Royal Lakeside Golf Club',
    'society', '33e609fc-a418-4e93-b539-ff85f2919cc3',
    '2025-12-17T04:50:19.427', NOW(), 'completed', 97, 85, 12, 'white'
) ON CONFLICT DO NOTHING
RETURNING id;

-- Alan Thomas (U214f2fe47e1681fbb26f0aba95930d64) - gross: 86, hcp: 11.2
INSERT INTO rounds (
    golfer_id, player_name, course_id, course_name, type, society_event_id,
    started_at, completed_at, status, total_gross, total_net, handicap_used, tee_marker
) VALUES (
    'U214f2fe47e1681fbb26f0aba95930d64', 'Alan Thomas', 'royal_lakeside', 'Royal Lakeside Golf Club',
    'society', '33e609fc-a418-4e93-b539-ff85f2919cc3',
    '2025-12-17T04:50:19.426', NOW(), 'completed', 86, 75, 11.2, 'white'
) ON CONFLICT DO NOTHING
RETURNING id;

-- Perry See-Hoe (TRGG-GUEST-0897) - gross: 80, hcp: 1.4
INSERT INTO rounds (
    golfer_id, player_name, course_id, course_name, type, society_event_id,
    started_at, completed_at, status, total_gross, total_net, handicap_used, tee_marker
) VALUES (
    'TRGG-GUEST-0897', 'See-Hoe, Perry', 'royal_lakeside', 'Royal Lakeside Golf Club',
    'society', '33e609fc-a418-4e93-b539-ff85f2919cc3',
    '2025-12-17T04:50:19.426', NOW(), 'completed', 80, 79, 1.4, 'white'
) ON CONFLICT DO NOTHING
RETURNING id;

-- =====================================================================
-- STEP 2: INSERT ROUND_HOLES FROM SCORECARDS
-- =====================================================================

-- Jimmy's holes (scorecard: 15b0e49f-f7b2-48ad-82f9-221f0af03942)
INSERT INTO round_holes (round_id, hole_number, par, stroke_index, gross_score, net_score, stableford_points)
SELECT
    r.id,
    s.hole_number,
    s.par,
    s.stroke_index,
    s.gross_score,
    s.net_score,
    -- Calculate stableford: roundedHcp=13, fullStrokes=0, remaining=13
    CASE
        WHEN (s.gross_score - CASE WHEN s.stroke_index <= 13 THEN 1 ELSE 0 END) - s.par <= -2 THEN 4
        WHEN (s.gross_score - CASE WHEN s.stroke_index <= 13 THEN 1 ELSE 0 END) - s.par = -1 THEN 3
        WHEN (s.gross_score - CASE WHEN s.stroke_index <= 13 THEN 1 ELSE 0 END) - s.par = 0 THEN 2
        WHEN (s.gross_score - CASE WHEN s.stroke_index <= 13 THEN 1 ELSE 0 END) - s.par = 1 THEN 1
        ELSE 0
    END
FROM rounds r
CROSS JOIN scores s
WHERE r.golfer_id = 'player_1765947017451'
AND r.society_event_id = '33e609fc-a418-4e93-b539-ff85f2919cc3'
AND s.scorecard_id = '15b0e49f-f7b2-48ad-82f9-221f0af03942'
ON CONFLICT (round_id, hole_number) DO NOTHING;

-- Tristan's holes (scorecard: a19c6807-e8f7-464e-90ab-906455c7d05a)
INSERT INTO round_holes (round_id, hole_number, par, stroke_index, gross_score, net_score, stableford_points)
SELECT
    r.id,
    s.hole_number,
    s.par,
    s.stroke_index,
    s.gross_score,
    s.net_score,
    -- Calculate stableford: roundedHcp=12, fullStrokes=0, remaining=12
    CASE
        WHEN (s.gross_score - CASE WHEN s.stroke_index <= 12 THEN 1 ELSE 0 END) - s.par <= -2 THEN 4
        WHEN (s.gross_score - CASE WHEN s.stroke_index <= 12 THEN 1 ELSE 0 END) - s.par = -1 THEN 3
        WHEN (s.gross_score - CASE WHEN s.stroke_index <= 12 THEN 1 ELSE 0 END) - s.par = 0 THEN 2
        WHEN (s.gross_score - CASE WHEN s.stroke_index <= 12 THEN 1 ELSE 0 END) - s.par = 1 THEN 1
        ELSE 0
    END
FROM rounds r
CROSS JOIN scores s
WHERE r.golfer_id = 'U533f2301ff76d319e0086e8340e4051c'
AND r.society_event_id = '33e609fc-a418-4e93-b539-ff85f2919cc3'
AND s.scorecard_id = 'a19c6807-e8f7-464e-90ab-906455c7d05a'
ON CONFLICT (round_id, hole_number) DO NOTHING;

-- Alan's holes (scorecard: 8079b885-0554-4eff-9ae8-0d88b85c1119)
INSERT INTO round_holes (round_id, hole_number, par, stroke_index, gross_score, net_score, stableford_points)
SELECT
    r.id,
    s.hole_number,
    s.par,
    s.stroke_index,
    s.gross_score,
    s.net_score,
    -- Calculate stableford: roundedHcp=11, fullStrokes=0, remaining=11
    CASE
        WHEN (s.gross_score - CASE WHEN s.stroke_index <= 11 THEN 1 ELSE 0 END) - s.par <= -2 THEN 4
        WHEN (s.gross_score - CASE WHEN s.stroke_index <= 11 THEN 1 ELSE 0 END) - s.par = -1 THEN 3
        WHEN (s.gross_score - CASE WHEN s.stroke_index <= 11 THEN 1 ELSE 0 END) - s.par = 0 THEN 2
        WHEN (s.gross_score - CASE WHEN s.stroke_index <= 11 THEN 1 ELSE 0 END) - s.par = 1 THEN 1
        ELSE 0
    END
FROM rounds r
CROSS JOIN scores s
WHERE r.golfer_id = 'U214f2fe47e1681fbb26f0aba95930d64'
AND r.society_event_id = '33e609fc-a418-4e93-b539-ff85f2919cc3'
AND s.scorecard_id = '8079b885-0554-4eff-9ae8-0d88b85c1119'
ON CONFLICT (round_id, hole_number) DO NOTHING;

-- Perry's holes (scorecard: 8ade09ba-dd22-4ec8-bdf1-879e999e094e)
INSERT INTO round_holes (round_id, hole_number, par, stroke_index, gross_score, net_score, stableford_points)
SELECT
    r.id,
    s.hole_number,
    s.par,
    s.stroke_index,
    s.gross_score,
    s.net_score,
    -- Calculate stableford: roundedHcp=1, fullStrokes=0, remaining=1
    CASE
        WHEN (s.gross_score - CASE WHEN s.stroke_index <= 1 THEN 1 ELSE 0 END) - s.par <= -2 THEN 4
        WHEN (s.gross_score - CASE WHEN s.stroke_index <= 1 THEN 1 ELSE 0 END) - s.par = -1 THEN 3
        WHEN (s.gross_score - CASE WHEN s.stroke_index <= 1 THEN 1 ELSE 0 END) - s.par = 0 THEN 2
        WHEN (s.gross_score - CASE WHEN s.stroke_index <= 1 THEN 1 ELSE 0 END) - s.par = 1 THEN 1
        ELSE 0
    END
FROM rounds r
CROSS JOIN scores s
WHERE r.golfer_id = 'TRGG-GUEST-0897'
AND r.society_event_id = '33e609fc-a418-4e93-b539-ff85f2919cc3'
AND s.scorecard_id = '8ade09ba-dd22-4ec8-bdf1-879e999e094e'
ON CONFLICT (round_id, hole_number) DO NOTHING;

-- =====================================================================
-- STEP 3: UPDATE STABLEFORD TOTALS ON ROUNDS
-- =====================================================================
UPDATE rounds r
SET total_stableford = (
    SELECT COALESCE(SUM(rh.stableford_points), 0)
    FROM round_holes rh
    WHERE rh.round_id = r.id
)
WHERE r.society_event_id = '33e609fc-a418-4e93-b539-ff85f2919cc3'
AND r.golfer_id IN ('player_1765947017451', 'U533f2301ff76d319e0086e8340e4051c', 'U214f2fe47e1681fbb26f0aba95930d64', 'TRGG-GUEST-0897');

-- =====================================================================
-- STEP 4: VERIFICATION
-- =====================================================================
SELECT
    r.golfer_id,
    r.player_name,
    r.total_gross,
    r.total_stableford,
    r.handicap_used,
    (SELECT COUNT(*) FROM round_holes rh WHERE rh.round_id = r.id) as holes_count
FROM rounds r
WHERE r.society_event_id = '33e609fc-a418-4e93-b539-ff85f2919cc3'
ORDER BY r.total_stableford DESC;
