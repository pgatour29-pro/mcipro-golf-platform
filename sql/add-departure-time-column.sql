-- Add departure_time column to society_events table
-- This allows events to have separate departure time and tee time (start_time)

-- Add the new column
ALTER TABLE society_events
ADD COLUMN IF NOT EXISTS departure_time TIME;

-- Add comment to explain the field
COMMENT ON COLUMN society_events.departure_time IS 'Time when players should depart/meet (e.g., 10:45). This is typically earlier than start_time (tee time).';

-- Example: Departure 10:45, First Tee 12:00
-- departure_time = '10:45:00'
-- start_time = '12:00:00'
