-- Add recurrence fields to society_events table

ALTER TABLE society_events
ADD COLUMN IF NOT EXISTS recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recur_frequency TEXT, -- 'weekly', 'biweekly', 'monthly'
ADD COLUMN IF NOT EXISTS recur_day_of_week INTEGER, -- 0-6 (Sunday-Saturday) for weekly/biweekly
ADD COLUMN IF NOT EXISTS recur_monthly_pattern TEXT, -- 'first_monday', 'last_friday', etc. for monthly
ADD COLUMN IF NOT EXISTS recur_end_type TEXT, -- 'until' or 'count'
ADD COLUMN IF NOT EXISTS recur_until DATE, -- End date if recur_end_type = 'until'
ADD COLUMN IF NOT EXISTS recur_count INTEGER; -- Number of occurrences if recur_end_type = 'count'

-- Add index for recurring events
CREATE INDEX IF NOT EXISTS idx_events_recurring ON society_events(recurring) WHERE recurring = true;
