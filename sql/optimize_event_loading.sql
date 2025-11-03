-- PERFORMANCE OPTIMIZATION: Event Registration Counting
-- This function counts registrations per event using PostgreSQL aggregation
-- Replaces loading ALL registration rows and counting in JavaScript

CREATE OR REPLACE FUNCTION count_event_registrations(event_ids UUID[])
RETURNS TABLE (event_id UUID, count BIGINT)
LANGUAGE SQL
STABLE
AS $$
    SELECT
        event_id,
        COUNT(*)::BIGINT as count
    FROM event_registrations
    WHERE event_id = ANY(event_ids)
    GROUP BY event_id;
$$;

-- Add helpful comment
COMMENT ON FUNCTION count_event_registrations IS 'Fast event registration counting using PostgreSQL GROUP BY aggregation. Returns one row per event with count instead of loading all registration rows.';

-- Performance improvement example:
-- Before: 50 events × 20 registrations = 1000 rows transferred
-- After: 50 rows transferred (one per event with count)
-- Expected speedup: 10-20x faster for events with many registrations
