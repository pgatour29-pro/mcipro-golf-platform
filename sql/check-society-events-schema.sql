-- Check the actual schema of society_events table

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'society_events'
ORDER BY ordinal_position;
