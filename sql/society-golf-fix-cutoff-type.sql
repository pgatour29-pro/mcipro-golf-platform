-- Change cutoff column from timestamp to text to prevent timezone conversion
-- This allows us to store local time exactly as entered

ALTER TABLE society_events
ALTER COLUMN cutoff TYPE TEXT;

-- Update any existing data to remove timezone info (if any)
UPDATE society_events
SET cutoff = SUBSTRING(cutoff FROM 1 FOR 19)
WHERE cutoff IS NOT NULL;
