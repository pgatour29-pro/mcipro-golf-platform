-- =====================================================================
-- BULK ASSIGN POINTS - All Events Since December 1, 2025
-- =====================================================================
-- This script assigns championship points to all events that have rounds
-- completed since December 1, 2025.
-- Uses linear point system: 10, 9, 8, 7, 6, 5, 4, 3, 2, 1
-- =====================================================================

-- First, let's see what events we have since Dec 1, 2025
-- Check both rounds table and scorecards table
SELECT
    se.id as event_id,
    se.title,
    se.event_date,
    se.scoring_format,
    COUNT(DISTINCT r.id) as rounds_count,
    COUNT(DISTINCT sc.id) as scorecards_count
FROM society_events se
LEFT JOIN rounds r ON r.society_event_id = se.id
LEFT JOIN scorecards sc ON sc.event_id = se.id::text
WHERE se.event_date >= '2025-12-01'
GROUP BY se.id, se.title, se.event_date, se.scoring_format
ORDER BY se.event_date DESC;

-- =====================================================================
-- STEP 1: Clear existing event_results for these events (allows re-run)
-- =====================================================================
DELETE FROM event_results
WHERE event_id IN (
    SELECT id FROM society_events WHERE event_date >= '2025-12-01'
);

-- =====================================================================
-- STEP 2: Insert event results with positions and points
-- Uses window functions to calculate positions per event
-- =====================================================================
INSERT INTO event_results (
    event_id,
    round_id,
    player_id,
    player_name,
    division,
    position,
    score,
    score_type,
    points_earned,
    status,
    is_counted,
    event_date
)
SELECT
    r.society_event_id as event_id,
    r.id as round_id,
    r.golfer_id as player_id,
    r.player_name,
    NULL as division,
    -- Position: rank by stableford (higher is better) or gross (lower is better)
    ROW_NUMBER() OVER (
        PARTITION BY r.society_event_id
        ORDER BY
            CASE
                WHEN COALESCE(se.scoring_format, 'stableford') IN ('stableford')
                THEN r.total_stableford
                ELSE NULL
            END DESC NULLS LAST,
            CASE
                WHEN COALESCE(se.scoring_format, 'stableford') IN ('strokeplay', 'scramble')
                THEN r.total_gross
                ELSE NULL
            END ASC NULLS LAST,
            r.total_stableford DESC NULLS LAST
    ) as position,
    -- Score: stableford points or gross depending on format
    CASE
        WHEN COALESCE(se.scoring_format, 'stableford') = 'stableford' THEN r.total_stableford
        ELSE r.total_gross
    END as score,
    COALESCE(se.scoring_format, 'stableford') as score_type,
    -- Points: linear system 10, 9, 8, 7, 6, 5, 4, 3, 2, 1 (0 for positions > 10)
    GREATEST(0, 11 - ROW_NUMBER() OVER (
        PARTITION BY r.society_event_id
        ORDER BY
            CASE
                WHEN COALESCE(se.scoring_format, 'stableford') IN ('stableford')
                THEN r.total_stableford
                ELSE NULL
            END DESC NULLS LAST,
            CASE
                WHEN COALESCE(se.scoring_format, 'stableford') IN ('strokeplay', 'scramble')
                THEN r.total_gross
                ELSE NULL
            END ASC NULLS LAST,
            r.total_stableford DESC NULLS LAST
    )) as points_earned,
    'completed' as status,
    true as is_counted,
    se.event_date::date as event_date
FROM rounds r
JOIN society_events se ON se.id = r.society_event_id
WHERE se.event_date >= '2025-12-01'
AND r.status = 'completed'
AND (r.total_stableford IS NOT NULL OR r.total_gross IS NOT NULL);

-- =====================================================================
-- STEP 2B: Also insert from scorecards for events without rounds
-- (Some events may only have scorecard data)
-- =====================================================================
INSERT INTO event_results (
    event_id,
    round_id,
    player_id,
    player_name,
    division,
    position,
    score,
    score_type,
    points_earned,
    status,
    is_counted,
    event_date
)
SELECT
    ranked.event_id,
    NULL as round_id,
    ranked.player_id,
    ranked.player_name,
    NULL as division,
    ranked.position,
    ranked.score,
    ranked.score_type,
    GREATEST(0, 11 - ranked.position) as points_earned,
    'completed' as status,
    true as is_counted,
    ranked.event_date
FROM (
    SELECT
        se.id as event_id,
        sc.player_id,
        COALESCE(sc.player_name, up.display_name, up.name, sc.player_id) as player_name,
        sc.total_stableford as score,
        'stableford' as score_type,
        se.event_date::date as event_date,
        ROW_NUMBER() OVER (
            PARTITION BY se.id
            ORDER BY sc.total_stableford DESC NULLS LAST
        ) as position
    FROM scorecards sc
    JOIN society_events se ON se.id::text = sc.event_id
    LEFT JOIN user_profiles up ON up.line_user_id = sc.player_id
    WHERE se.event_date >= '2025-12-01'
    AND sc.status = 'completed'
    AND sc.total_stableford IS NOT NULL
    -- Only include scorecards where there's no corresponding round already inserted
    AND NOT EXISTS (
        SELECT 1 FROM event_results er
        WHERE er.event_id = se.id
        AND er.player_id = sc.player_id
    )
) ranked
-- Also exclude if the event already has results (prefer rounds data)
WHERE NOT EXISTS (
    SELECT 1 FROM event_results er WHERE er.event_id = ranked.event_id
);

-- =====================================================================
-- STEP 3: Also update point_allocation on society_events
-- =====================================================================
UPDATE society_events
SET point_allocation = '{"1": 10, "2": 9, "3": 8, "4": 7, "5": 6, "6": 5, "7": 4, "8": 3, "9": 2, "10": 1}'::jsonb
WHERE event_date >= '2025-12-01'
AND (point_allocation IS NULL OR point_allocation = '{}'::jsonb);

-- =====================================================================
-- STEP 4: Verification - Show results summary
-- =====================================================================
SELECT
    se.title,
    se.event_date,
    er.player_name,
    er.position,
    er.score,
    er.points_earned
FROM event_results er
JOIN society_events se ON se.id = er.event_id
WHERE se.event_date >= '2025-12-01'
ORDER BY se.event_date DESC, er.position ASC;

-- Summary counts
SELECT
    'Events with results' as metric,
    COUNT(DISTINCT event_id) as count
FROM event_results er
JOIN society_events se ON se.id = er.event_id
WHERE se.event_date >= '2025-12-01'
UNION ALL
SELECT
    'Total player results' as metric,
    COUNT(*) as count
FROM event_results er
JOIN society_events se ON se.id = er.event_id
WHERE se.event_date >= '2025-12-01'
UNION ALL
SELECT
    'Total points distributed' as metric,
    COALESCE(SUM(points_earned), 0) as count
FROM event_results er
JOIN society_events se ON se.id = er.event_id
WHERE se.event_date >= '2025-12-01';
