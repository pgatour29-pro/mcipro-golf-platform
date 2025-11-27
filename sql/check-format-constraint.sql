-- Check the format constraint

SELECT
    conname AS constraint_name,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
JOIN pg_class cl ON cl.oid = c.conrelid
WHERE contype = 'c'
AND cl.relname = 'society_events'
AND conname LIKE '%format%';

-- Also check what format values exist
SELECT DISTINCT format, COUNT(*) as count
FROM society_events
GROUP BY format
ORDER BY format;
