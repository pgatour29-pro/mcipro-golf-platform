-- Check actual schema of society_events table
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'society_events'
ORDER BY ordinal_position;

-- Show sample data if any exists
SELECT * FROM society_events LIMIT 3;
