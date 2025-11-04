-- Check current data types of all relevant columns
SELECT
    table_name,
    column_name,
    data_type,
    CASE
        WHEN data_type = 'text' THEN '✅ TEXT'
        WHEN data_type = 'uuid' THEN '❌ UUID (NEEDS FIX)'
        ELSE '⚠️ ' || data_type
    END as status
FROM information_schema.columns
WHERE (table_name = 'courses' AND column_name = 'id')
   OR (table_name = 'rounds' AND column_name = 'course_id')
   OR (table_name = 'rounds' AND column_name = 'golfer_id')
   OR (table_name = 'course_holes' AND column_name = 'course_id')
ORDER BY table_name, column_name;
