-- CREATE count_event_registrations RPC function
-- This function counts registrations for multiple events efficiently
-- Used by: Society Events System (GolferEventsManager)
--
-- Purpose: Return registration counts for a list of event IDs
-- Prevents N+1 query problem when loading event lists
--
-- Created: 2025-11-06
-- Issue: Function was referenced but never created, causing 404 errors

CREATE OR REPLACE FUNCTION count_event_registrations(event_ids UUID[])
RETURNS TABLE (
    event_id UUID,
    count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        er.event_id,
        COUNT(*)::BIGINT as count
    FROM event_registrations er
    WHERE er.event_id = ANY(event_ids)
    GROUP BY er.event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION count_event_registrations(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION count_event_registrations(UUID[]) TO anon;

COMMENT ON FUNCTION count_event_registrations IS 'Efficiently count registrations for multiple events. Returns event_id and count for each event that has registrations.';
