-- Fix the format typo in existing events
-- Change 'stabelford' to 'stableford' to match the constraint

UPDATE society_events
SET format = 'stableford'
WHERE format = 'stabelford';

-- Verify the fix
SELECT format, COUNT(*) as count
FROM society_events
WHERE format IS NOT NULL
GROUP BY format
ORDER BY count DESC;
