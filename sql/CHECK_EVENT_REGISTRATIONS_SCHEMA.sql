-- =====================================================
-- CHECK ACTUAL SCHEMA OF event_registrations TABLE
-- =====================================================
-- Run this in Supabase SQL Editor to see what columns exist

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'event_registrations'
ORDER BY ordinal_position;

-- Also show sample data if any exists
SELECT * FROM event_registrations LIMIT 3;
