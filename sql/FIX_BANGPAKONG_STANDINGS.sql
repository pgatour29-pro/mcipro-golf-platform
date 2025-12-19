-- ============================================================================
-- FIX BANGPAKONG EVENT FOR LEADERBOARD/STANDINGS
-- ============================================================================
-- Problem: Event was never finalized - no event_results, no points assigned
-- Solution: Update status and insert event_results with points
-- ============================================================================

-- Step 1: Update event status to completed and set point allocation
UPDATE society_events
SET
    status = 'completed',
    point_allocation = '[10, 9, 8, 7, 6, 5, 4, 3, 2, 1]'
WHERE id = 'bdf4c783-73f9-477d-958a-5b2aba80b041';

-- Step 2: Insert event results with points (linear: 10, 9, 8)
-- Position 1: Alan Thomas - 38 points (highest stableford)
-- Position 2: Pete Park - 37 points
-- Position 3: Tristan Gilbert - 27 points

INSERT INTO event_results (
    event_id,
    player_id,
    player_name,
    position,
    score,
    score_type,
    points_earned,
    status,
    is_counted,
    event_date,
    created_at
) VALUES
-- 1st Place: Alan Thomas (38 stableford)
(
    'bdf4c783-73f9-477d-958a-5b2aba80b041',
    'U214f2fe47e1681fbb26f0aba95930d64',
    'Alan Thomas',
    1,
    38,
    'stableford',
    10,
    'completed',
    true,
    '2025-12-19',
    NOW()
),
-- 2nd Place: Pete Park (37 stableford)
(
    'bdf4c783-73f9-477d-958a-5b2aba80b041',
    'U2b6d976f19bca4b2f4374ae0e10ed873',
    'Pete Park',
    2,
    37,
    'stableford',
    9,
    'completed',
    true,
    '2025-12-19',
    NOW()
),
-- 3rd Place: Tristan Gilbert (27 stableford)
(
    'bdf4c783-73f9-477d-958a-5b2aba80b041',
    'U533f2301ff76d319e0086e8340e4051c',
    'Gilbert, Tristan',
    3,
    27,
    'stableford',
    8,
    'completed',
    true,
    '2025-12-19',
    NOW()
);

-- Verify the fix
SELECT 'EVENT STATUS' as check_type, status, point_allocation::text
FROM society_events
WHERE id = 'bdf4c783-73f9-477d-958a-5b2aba80b041';

SELECT 'EVENT RESULTS' as check_type, player_name, position, score, points_earned
FROM event_results
WHERE event_id = 'bdf4c783-73f9-477d-958a-5b2aba80b041'
ORDER BY position;
