-- Add start_time column to society_events table

ALTER TABLE society_events
ADD COLUMN IF NOT EXISTS start_time TEXT;

-- Add comment
COMMENT ON COLUMN society_events.start_time IS 'Event start time in HH:MM format (e.g., 08:00)';
