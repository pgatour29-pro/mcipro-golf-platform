-- DELETE ALL JOA DECEMBER EVENTS
DELETE FROM society_events
WHERE organizer_name = 'JOA Golf Pattaya'
  AND event_date BETWEEN '2025-12-01' AND '2025-12-31';

-- Verify deletion
SELECT COUNT(*) as remaining_joa_events
FROM society_events
WHERE organizer_name = 'JOA Golf Pattaya'
  AND event_date BETWEEN '2025-12-01' AND '2025-12-31';
