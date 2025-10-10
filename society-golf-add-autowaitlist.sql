-- Add auto_waitlist column to society_events table

ALTER TABLE society_events
ADD COLUMN IF NOT EXISTS auto_waitlist BOOLEAN DEFAULT true;

-- Update existing events to have auto_waitlist enabled by default
UPDATE society_events
SET auto_waitlist = true
WHERE auto_waitlist IS NULL;
