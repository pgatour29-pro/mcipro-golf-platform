-- Check what status values are allowed
SELECT
    con.conname as constraint_name,
    pg_get_constraintdef(con.oid) as constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'society_events'
  AND con.conname LIKE '%status%';

-- Also check if there's an enum type
SELECT
    t.typname,
    e.enumlabel
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname LIKE '%status%'
ORDER BY e.enumsortorder;
