-- Add enable_waitlist column to society_events table
-- Run this in your Supabase SQL Editor to enable waitlist functionality

-- Add the column if it doesn't exist
ALTER TABLE society_events
ADD COLUMN IF NOT EXISTS enable_waitlist BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN society_events.enable_waitlist IS 'Whether this event allows golfers to join a waitlist when full';

-- Update existing events to have waitlist enabled by default
UPDATE society_events
SET enable_waitlist = true
WHERE enable_waitlist IS NULL;

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'society_events'
AND column_name = 'enable_waitlist';
