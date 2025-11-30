-- Check the format column constraint
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'society_events'::regclass
  AND conname = 'society_events_format_check';

-- Also check the column definition
SELECT
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'society_events'
  AND column_name = 'format';
