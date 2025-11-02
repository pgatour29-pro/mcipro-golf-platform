-- =====================================================
-- DIAGNOSTIC: Check ALL constraints and column types
-- =====================================================

-- 1. Check payment_status constraint
SELECT
    conname as constraint_name,
    pg_get_constraintdef(c.oid) as constraint_definition
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname = 'event_registrations'
  AND conname LIKE '%payment%';

-- 2. Check event_registrations columns and types
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'event_registrations'
ORDER BY ordinal_position;

-- 3. Check society_events columns (for organizer_id issue)
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'society_events'
ORDER BY ordinal_position;

-- 4. Check rounds table columns (for order query issue)
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'rounds'
ORDER BY ordinal_position;

-- 5. Check profiles table UUID column
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN ('id', 'line_user_id', 'user_id')
ORDER BY ordinal_position;

-- 6. Sample data to see actual values
SELECT 'event_registrations sample:' as info;
SELECT * FROM event_registrations LIMIT 1;

SELECT 'society_events sample:' as info;
SELECT * FROM society_events LIMIT 1;

SELECT 'rounds sample:' as info;
SELECT * FROM rounds LIMIT 1;

SELECT 'profiles sample:' as info;
SELECT * FROM profiles LIMIT 1;
