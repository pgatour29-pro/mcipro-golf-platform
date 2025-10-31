-- ============================================================================
-- FIND THE CORRECT COLUMN NAME IN ROUNDS TABLE
-- ============================================================================

-- Show ALL columns in rounds table
SELECT
    column_name,
    data_type,
    is_nullable,
    CASE
        WHEN column_name ILIKE '%user%' THEN '👤 USER COLUMN'
        WHEN column_name ILIKE '%golfer%' THEN '⛳ GOLFER COLUMN'
        WHEN column_name ILIKE '%player%' THEN '🏌️ PLAYER COLUMN'
        WHEN column_name ILIKE '%line%' THEN '📱 LINE COLUMN'
        ELSE ''
    END as likely_purpose
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'rounds'
ORDER BY ordinal_position;

-- Count all rounds (no filter)
SELECT
    '=== TOTAL ROUNDS IN TABLE ===' as section,
    COUNT(*) as total_rounds
FROM rounds;

-- Show sample records (first 3)
SELECT
    '=== SAMPLE ROUNDS (first 3) ===' as section,
    *
FROM rounds
ORDER BY created_at DESC
LIMIT 3;
