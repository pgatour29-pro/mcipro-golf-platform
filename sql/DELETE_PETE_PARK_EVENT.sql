-- Delete the incorrectly created event by Pete Park on Dec 17
-- Run this in Supabase SQL Editor

-- First, find it
SELECT id, title, event_date, organizer_name, created_at
FROM society_events
WHERE organizer_name = 'Pete Park'
   OR (event_date = '2025-12-17' AND created_at > NOW() - INTERVAL '1 hour');

-- Delete it
DELETE FROM society_events
WHERE organizer_name = 'Pete Park';

-- Verify it's gone
SELECT 'Remaining events with Pete Park:' as check_item, COUNT(*) as count
FROM society_events
WHERE organizer_name = 'Pete Park';
