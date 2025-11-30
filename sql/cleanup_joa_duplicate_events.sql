-- =====================================================
-- CLEANUP JOA DUPLICATE EVENTS
-- =====================================================
-- Removes duplicate JOA events, keeping only the most recent ones
-- =====================================================

-- First, let's see what we have
SELECT event_date, title, COUNT(*) as count
FROM society_events
WHERE organizer_name = 'JOA Golf Pattaya'
  AND event_date BETWEEN '2025-12-01' AND '2025-12-31'
GROUP BY event_date, title
HAVING COUNT(*) > 1
ORDER BY event_date;

-- Delete duplicates, keeping only the most recent record for each date
DELETE FROM society_events
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY event_date, title
                   ORDER BY created_at DESC
               ) as rn
        FROM society_events
        WHERE organizer_name = 'JOA Golf Pattaya'
          AND event_date BETWEEN '2025-12-01' AND '2025-12-31'
    ) t
    WHERE rn > 1
);

-- Verify we now have exactly 31 events
SELECT COUNT(*) as total_events
FROM society_events
WHERE organizer_name = 'JOA Golf Pattaya'
  AND event_date BETWEEN '2025-12-01' AND '2025-12-31';

-- Show the clean list
SELECT event_date, title, course_name, member_fee, departure_time, start_time
FROM society_events
WHERE organizer_name = 'JOA Golf Pattaya'
  AND event_date BETWEEN '2025-12-01' AND '2025-12-31'
ORDER BY event_date;
