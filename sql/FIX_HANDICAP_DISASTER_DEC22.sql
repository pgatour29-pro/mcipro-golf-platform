-- ============================================================================
-- FIX HANDICAP DISASTER - December 22, 2025 Treasure Hill Round
-- ============================================================================
-- Problem: society_handicaps table had NO UNIQUE CONSTRAINT on (golfer_id, society_id)
--          This caused upsert to INSERT new rows instead of UPDATE
--          Multiple duplicate records cascaded into wrong handicap calculations
-- ============================================================================

-- Step 1: See the damage - list all duplicates
SELECT
    golfer_id,
    society_id,
    COUNT(*) as duplicate_count,
    string_agg(handicap_index::text, ', ' ORDER BY last_calculated_at DESC) as values
FROM society_handicaps
GROUP BY golfer_id, society_id
HAVING COUNT(*) > 1
ORDER BY golfer_id;

-- Step 2: Delete ALL records for affected players (clean slate)
-- We'll re-insert the correct values
DELETE FROM society_handicaps
WHERE golfer_id IN (
    'U2b6d976f19bca4b2f4374ae0e10ed873',  -- Pete Park
    'U533f2301ff76d319e0086e8340e4051c',  -- Tristan Gilbert
    'U8e1e7241961a2747032dece7929adbde',  -- Billy Shepley
    'U214f2fe47e1681fbb26f0aba95930d64'   -- Alan Thomas
);

-- Step 3: Insert CORRECT handicap values
-- These are the values BEFORE today's disastrous round
INSERT INTO society_handicaps (golfer_id, society_id, handicap_index, calculation_method, last_calculated_at)
VALUES
    -- Pete Park: Universal 3.2, TRGG 2.8
    ('U2b6d976f19bca4b2f4374ae0e10ed873', NULL, 3.2, 'MANUAL', NOW()),
    ('U2b6d976f19bca4b2f4374ae0e10ed873', '7c0e4b72-d925-44bc-afda-38259a7ba346', 2.8, 'MANUAL', NOW()),

    -- Tristan Gilbert: Universal 13.2, TRGG 11.0
    ('U533f2301ff76d319e0086e8340e4051c', NULL, 13.2, 'MANUAL', NOW()),
    ('U533f2301ff76d319e0086e8340e4051c', '7c0e4b72-d925-44bc-afda-38259a7ba346', 11.0, 'MANUAL', NOW()),

    -- Billy Shepley: Universal 7.8, TRGG 7.8 (assume same if no society record)
    ('U8e1e7241961a2747032dece7929adbde', NULL, 7.8, 'MANUAL', NOW()),
    ('U8e1e7241961a2747032dece7929adbde', '7c0e4b72-d925-44bc-afda-38259a7ba346', 7.8, 'MANUAL', NOW()),

    -- Alan Thomas: Universal 12.2, TRGG 11.9
    ('U214f2fe47e1681fbb26f0aba95930d64', NULL, 12.2, 'MANUAL', NOW()),
    ('U214f2fe47e1681fbb26f0aba95930d64', '7c0e4b72-d925-44bc-afda-38259a7ba346', 11.9, 'MANUAL', NOW());

-- Step 4: Delete ALL other duplicates in the table (not just these players)
-- Keep the MOST RECENT record for each (golfer_id, society_id) combination
WITH ranked AS (
    SELECT
        ctid,  -- PostgreSQL row identifier
        golfer_id,
        society_id,
        ROW_NUMBER() OVER (
            PARTITION BY golfer_id, COALESCE(society_id::text, 'NULL')
            ORDER BY last_calculated_at DESC NULLS LAST
        ) as rn
    FROM society_handicaps
)
DELETE FROM society_handicaps
WHERE ctid IN (SELECT ctid FROM ranked WHERE rn > 1);

-- Step 5: Verify cleanup - should show no duplicates
SELECT
    golfer_id,
    society_id,
    COUNT(*) as count
FROM society_handicaps
GROUP BY golfer_id, society_id
HAVING COUNT(*) > 1;

-- Step 6: ADD UNIQUE CONSTRAINT to prevent this from ever happening again
-- First, check if constraint already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'society_handicaps_golfer_society_unique'
    ) THEN
        ALTER TABLE society_handicaps
        ADD CONSTRAINT society_handicaps_golfer_society_unique
        UNIQUE (golfer_id, society_id);

        RAISE NOTICE 'Unique constraint added successfully';
    ELSE
        RAISE NOTICE 'Unique constraint already exists';
    END IF;
END $$;

-- Step 7: Verify the fix - show current handicaps for affected players
SELECT
    p.name,
    sh.golfer_id,
    CASE WHEN sh.society_id IS NULL THEN 'Universal' ELSE 'TRGG' END as type,
    sh.handicap_index,
    sh.last_calculated_at
FROM society_handicaps sh
LEFT JOIN user_profiles p ON p.line_user_id = sh.golfer_id
WHERE sh.golfer_id IN (
    'U2b6d976f19bca4b2f4374ae0e10ed873',
    'U533f2301ff76d319e0086e8340e4051c',
    'U8e1e7241961a2747032dece7929adbde',
    'U214f2fe47e1681fbb26f0aba95930d64'
)
ORDER BY p.name, sh.society_id NULLS FIRST;
