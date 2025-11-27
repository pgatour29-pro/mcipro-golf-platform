-- Check what the valid status values are for society_events

SELECT
    conname AS constraint_name,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
JOIN pg_class cl ON cl.oid = c.conrelid
WHERE contype = 'c'
AND cl.relname = 'society_events'
AND conname = 'society_events_status_check';

-- Also check existing events to see what status values are currently used
SELECT DISTINCT status
FROM society_events
ORDER BY status;
