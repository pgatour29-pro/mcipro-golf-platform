-- Check actual status constraint on society_events table
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'society_events_status_check';

-- Check what status values are actually being used
SELECT DISTINCT status, COUNT(*) as count
FROM society_events
GROUP BY status
ORDER BY count DESC;
