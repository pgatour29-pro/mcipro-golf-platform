-- =====================================================
-- DELETE DUPLICATE TRAVELLERS REST EVENTS
-- =====================================================
-- Remove duplicate events keeping only one of each

BEGIN;

-- Delete duplicates from November, keeping only the first created of each title+date combination
DELETE FROM society_events
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY title, event_date
                   ORDER BY created_at ASC
               ) as rn
        FROM society_events
        WHERE event_date >= '2025-11-01'
        AND event_date < '2025-12-01'
    ) t
    WHERE rn > 1
);

-- Delete duplicates from December, keeping only the first created of each title+date combination
DELETE FROM society_events
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY title, event_date
                   ORDER BY created_at ASC
               ) as rn
        FROM society_events
        WHERE event_date >= '2025-12-01'
        AND event_date < '2026-01-01'
    ) t
    WHERE rn > 1
);

-- Show results
SELECT
    DATE_TRUNC('month', event_date) as month,
    COUNT(*) as event_count
FROM society_events
GROUP BY DATE_TRUNC('month', event_date)
ORDER BY month DESC;

COMMIT;
