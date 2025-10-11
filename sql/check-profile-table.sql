-- Check the society_profiles table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'society_profiles'
ORDER BY ordinal_position;

-- Check for any constraints
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'society_profiles'::regclass;

-- Check for any triggers
SELECT
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'society_profiles';

-- Try to see actual data
SELECT * FROM society_profiles LIMIT 5;
