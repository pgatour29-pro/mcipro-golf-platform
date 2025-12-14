-- Add caddy_numbers column to event_registrations table
-- This allows users to manually input their caddy booking info for events
-- December 14, 2025

-- Add the column if it doesn't exist
ALTER TABLE event_registrations
ADD COLUMN IF NOT EXISTS caddy_numbers TEXT;

-- Add a comment explaining the column
COMMENT ON COLUMN event_registrations.caddy_numbers IS 'Manual caddy number input (e.g., "42, 15" for multiple caddies)';

-- Verify the column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'event_registrations'
AND column_name = 'caddy_numbers';
