-- Admin function to delete society events (bypasses RLS)
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION admin_delete_society_events(target_date DATE)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete registrations first
    DELETE FROM event_registrations
    WHERE event_id IN (SELECT id FROM society_events WHERE event_date = target_date);

    -- Delete the events
    DELETE FROM society_events WHERE event_date = target_date;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION admin_delete_society_events(DATE) TO anon;
GRANT EXECUTE ON FUNCTION admin_delete_society_events(DATE) TO authenticated;

-- To delete Jan 23 events, run:
-- SELECT admin_delete_society_events('2026-01-23');
