-- Fix orphan events that don't have society prefix
-- Run this in Supabase SQL Editor

-- First, show events created today that don't have JOA Golf prefix
SELECT id, title, event_date, organizer_name, created_at
FROM society_events
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Update the orphan event to have JOA Golf prefix (the one just created)
UPDATE society_events
SET title = 'JOA Golf - ' || title,
    organizer_name = 'JOA Golf Pattaya'
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND title NOT LIKE 'JOA Golf%'
  AND organizer_name = 'JOA Golf Pattaya';

-- Delete the Pete Park event (Dec 17)
DELETE FROM society_events
WHERE organizer_name = 'Pete Park'
  AND event_date = '2025-12-17';

-- Verify
SELECT id, title, event_date, organizer_name, created_at
FROM society_events
WHERE event_date = '2025-12-17'
ORDER BY created_at DESC;
