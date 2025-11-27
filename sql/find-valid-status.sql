-- Find the actual valid status values for society_events

-- 1. Show the constraint definition
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
JOIN pg_class cl ON cl.oid = c.conrelid
WHERE contype = 'c'
AND cl.relname = 'society_events'
AND conname LIKE '%status%';

-- 2. Show what status values are CURRENTLY used in existing events
SELECT DISTINCT status, COUNT(*) as count
FROM society_events
GROUP BY status
ORDER BY status;

-- 3. Show a sample event with its status
SELECT id, title, event_date, status
FROM society_events
LIMIT 5;
