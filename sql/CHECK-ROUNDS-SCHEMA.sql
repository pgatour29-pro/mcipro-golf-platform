-- Check ALL columns in rounds table
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable,
    CASE
        WHEN column_name LIKE '%user%' OR column_name LIKE '%golfer%' THEN '👤 IDENTITY'
        WHEN column_name LIKE '%course%' THEN '⛳ COURSE'
        ELSE '📊 DATA'
    END as category
FROM information_schema.columns
WHERE table_name = 'rounds'
ORDER BY ordinal_position;
