-- =====================================================
-- FIX DUPLICATE SOCIETY MEMBERS
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Find duplicates (same golfer_id in same society)
SELECT 'FINDING DUPLICATES' as info;

SELECT
    sm.society_id,
    sp.society_name,
    sm.golfer_id,
    up.name as player_name,
    COUNT(*) as duplicate_count
FROM society_members sm
LEFT JOIN society_profiles sp ON sp.id = sm.society_id
LEFT JOIN user_profiles up ON up.line_user_id = sm.golfer_id
GROUP BY sm.society_id, sp.society_name, sm.golfer_id, up.name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, sp.society_name;

-- Step 2: Show all duplicate entries with details
SELECT 'DUPLICATE ENTRIES DETAIL' as info;

WITH duplicates AS (
    SELECT society_id, golfer_id
    FROM society_members
    GROUP BY society_id, golfer_id
    HAVING COUNT(*) > 1
)
SELECT
    sm.id,
    sp.society_name,
    up.name as player_name,
    sm.golfer_id,
    sm.member_number,
    sm.status,
    sm.joined_at,
    sm.is_primary_society
FROM society_members sm
JOIN duplicates d ON d.society_id = sm.society_id AND d.golfer_id = sm.golfer_id
LEFT JOIN society_profiles sp ON sp.id = sm.society_id
LEFT JOIN user_profiles up ON up.line_user_id = sm.golfer_id
ORDER BY sp.society_name, up.name, sm.joined_at DESC;

-- Step 3: DELETE duplicates, keeping the NEWEST entry (most recent joined_at)
SELECT 'DELETING DUPLICATES (keeping newest)' as info;

DELETE FROM society_members sm1
WHERE EXISTS (
    -- Find a newer entry for the same society_id + golfer_id
    SELECT 1 FROM society_members sm2
    WHERE sm2.society_id = sm1.society_id
    AND sm2.golfer_id = sm1.golfer_id
    AND sm2.joined_at > sm1.joined_at
);

-- Step 4: Verify cleanup
SELECT 'VERIFICATION - should show no duplicates' as info;

SELECT
    sm.society_id,
    sp.society_name,
    sm.golfer_id,
    COUNT(*) as count
FROM society_members sm
LEFT JOIN society_profiles sp ON sp.id = sm.society_id
GROUP BY sm.society_id, sp.society_name, sm.golfer_id
HAVING COUNT(*) > 1;

-- Step 5: Add unique constraint to prevent future duplicates
-- Note: Only run this AFTER cleaning up duplicates
SELECT 'ADDING UNIQUE CONSTRAINT' as info;

-- First check if constraint already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'society_members_society_golfer_unique'
    ) THEN
        ALTER TABLE society_members
        ADD CONSTRAINT society_members_society_golfer_unique
        UNIQUE (society_id, golfer_id);
        RAISE NOTICE 'Unique constraint added successfully';
    ELSE
        RAISE NOTICE 'Unique constraint already exists';
    END IF;
END $$;

SELECT 'DONE - Duplicates cleaned up and unique constraint added' as status;
