-- Check actual schema of event_registrations table
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'event_registrations'
ORDER BY ordinal_position;

-- Show sample row if any
SELECT * FROM event_registrations LIMIT 1;
