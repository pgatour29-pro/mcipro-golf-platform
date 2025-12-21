-- ============================================================================
-- CLEANUP DUPLICATE SCORECARDS
-- ============================================================================
-- Date: December 22, 2025
-- Problem: Multiple scorecards created for the same player per event
--          (e.g., Pete Park had 6 scorecards for one event)
-- Solution: Keep only the LATEST scorecard for each player per event
-- ============================================================================

-- First, let's see the duplicates
SELECT
    event_id,
    player_id,
    player_name,
    COUNT(*) as duplicate_count
FROM scorecards
GROUP BY event_id, player_id, player_name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Delete duplicates, keeping only the LATEST (most recent created_at) for each player per event
-- This uses a CTE with ROW_NUMBER() to identify which rows to delete

WITH ranked_scorecards AS (
    SELECT
        id,
        event_id,
        player_id,
        player_name,
        created_at,
        ROW_NUMBER() OVER (
            PARTITION BY event_id, player_id
            ORDER BY created_at DESC
        ) as rn
    FROM scorecards
)
DELETE FROM scorecards
WHERE id IN (
    SELECT id FROM ranked_scorecards WHERE rn > 1
);

-- Verify cleanup - should return 0 rows if successful
SELECT
    event_id,
    player_id,
    player_name,
    COUNT(*) as duplicate_count
FROM scorecards
GROUP BY event_id, player_id, player_name
HAVING COUNT(*) > 1;

-- Also clean up orphaned scores (scores that reference deleted scorecards)
DELETE FROM scores
WHERE scorecard_id NOT IN (SELECT id FROM scorecards);

-- Show final count per event
SELECT
    e.title as event_name,
    COUNT(s.id) as player_count
FROM scorecards s
JOIN society_events e ON s.event_id::uuid = e.id
GROUP BY e.title
ORDER BY e.title;
