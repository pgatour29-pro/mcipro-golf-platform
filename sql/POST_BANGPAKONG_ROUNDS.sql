-- ============================================================================
-- POST ROUNDS TO HISTORY - Bangpakong Dec 19, 2025
-- ============================================================================
-- Run this AFTER FIX_HOLE12_SCORES.sql
-- This adds the rounds to each player's round history
-- ============================================================================

-- Pete Park's round
INSERT INTO rounds (
    golfer_id,
    course_id,
    course_name,
    type,
    society_event_id,
    played_at,
    started_at,
    completed_at,
    status,
    total_gross,
    total_net,
    total_stableford,
    handicap_used,
    tee_marker,
    course_rating,
    slope_rating,
    player_name,
    game_config
) VALUES (
    'U2b6d976f19bca4b2f4374ae0e10ed873',  -- Pete Park's LINE user ID
    'bangpakong',
    'BRC',
    'society',
    'bdf4c783-73f9-477d-958a-5b2aba80b041',  -- Bangpakong event ID
    '2025-12-19',
    '2025-12-19 07:00:00+07',
    '2025-12-19 12:00:00+07',
    'completed',
    74,   -- total gross
    NULL,
    37,   -- total stableford
    2.8,  -- handicap
    'white',
    72.0,
    113,
    'Pete Park',
    '{"formats": ["stableford"]}'
);

-- Alan Thomas's round
INSERT INTO rounds (
    golfer_id,
    course_id,
    course_name,
    type,
    society_event_id,
    played_at,
    started_at,
    completed_at,
    status,
    total_gross,
    total_net,
    total_stableford,
    handicap_used,
    tee_marker,
    course_rating,
    slope_rating,
    player_name,
    game_config
) VALUES (
    'U214f2fe47e1681fbb26f0aba95930d64',  -- Alan Thomas's LINE user ID
    'bangpakong',
    'BRC',
    'society',
    'bdf4c783-73f9-477d-958a-5b2aba80b041',  -- Bangpakong event ID
    '2025-12-19',
    '2025-12-19 07:00:00+07',
    '2025-12-19 12:00:00+07',
    'completed',
    81,   -- total gross (after hole 12 fix: 80 + 1)
    NULL,
    38,   -- total stableford (19 front + 19 back)
    11.2, -- handicap
    'white',
    72.0,
    113,
    'Alan Thomas',
    '{"formats": ["stableford"]}'
);

-- Tristan Gilbert's round
INSERT INTO rounds (
    golfer_id,
    course_id,
    course_name,
    type,
    society_event_id,
    played_at,
    started_at,
    completed_at,
    status,
    total_gross,
    total_net,
    total_stableford,
    handicap_used,
    tee_marker,
    course_rating,
    slope_rating,
    player_name,
    game_config
) VALUES (
    'U533f2301ff76d319e0086e8340e4051c',  -- Tristan Gilbert's LINE user ID
    'bangpakong',
    'BRC',
    'society',
    'bdf4c783-73f9-477d-958a-5b2aba80b041',  -- Bangpakong event ID
    '2025-12-19',
    '2025-12-19 07:00:00+07',
    '2025-12-19 12:00:00+07',
    'completed',
    96,   -- total gross (after hole 12 fix: 94 + 2)
    NULL,
    27,   -- total stableford (12 front + 15 back)
    12.0, -- handicap
    'white',
    72.0,
    113,
    'Gilbert, Tristan',
    '{"formats": ["stableford"]}'
);

-- Verify the inserts
SELECT
    player_name,
    course_name,
    played_at,
    total_gross,
    total_stableford,
    handicap_used,
    status
FROM rounds
WHERE society_event_id = 'bdf4c783-73f9-477d-958a-5b2aba80b041'
ORDER BY total_stableford DESC;
