-- =====================================================
-- DIAGNOSTIC: Show ACTUAL event_registrations schema
-- =====================================================
-- Run this in Supabase SQL Editor to see real columns

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'event_registrations'
ORDER BY ordinal_position;

-- Show a sample row if any exist
SELECT * FROM event_registrations LIMIT 1;
