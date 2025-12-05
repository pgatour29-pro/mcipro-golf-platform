-- =====================================================
-- REMOVE DUPLICATE SOCIETY MEMBERS
-- =====================================================
-- This script removes duplicate entries in society_members
-- and adds a unique constraint to prevent future duplicates
-- =====================================================

-- PART 1: Find and display duplicates
SELECT
    'DUPLICATES FOUND' as status,
    society_id,
    golfer_id,
    COUNT(*) as duplicate_count,
    string_agg(id::text, ', ') as duplicate_ids
FROM society_members
GROUP BY society_id, golfer_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- PART 2: Delete duplicates, keeping only the OLDEST entry (lowest id)
-- This preserves the original entry and removes duplicates
WITH duplicates AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY society_id, golfer_id
            ORDER BY created_at ASC, id ASC
        ) as rn
    FROM society_members
)
DELETE FROM society_members
WHERE id IN (
    SELECT id
    FROM duplicates
    WHERE rn > 1
);

-- PART 3: Add unique constraint to prevent future duplicates
-- Drop if exists first
ALTER TABLE society_members
DROP CONSTRAINT IF EXISTS unique_society_golfer;

-- Add unique constraint
ALTER TABLE society_members
ADD CONSTRAINT unique_society_golfer UNIQUE (society_id, golfer_id);

-- PART 4: Verification - check for any remaining duplicates
SELECT
    'VERIFICATION - Remaining duplicates' as status,
    society_id,
    golfer_id,
    COUNT(*) as count
FROM society_members
GROUP BY society_id, golfer_id
HAVING COUNT(*) > 1;

-- PART 5: Show total members per society
SELECT
    'TOTAL MEMBERS BY SOCIETY' as status,
    sp.society_name,
    COUNT(sm.id) as total_members
FROM society_members sm
JOIN society_profiles sp ON sm.society_id = sp.id
WHERE sm.status = 'active'
GROUP BY sp.society_name
ORDER BY total_members DESC;
