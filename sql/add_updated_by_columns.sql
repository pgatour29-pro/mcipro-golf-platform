-- Add updated_by columns to society_events table for tracking who modified events
-- These columns are used by LINE notifications to show "Changed by: [Name]"

-- Add updated_by column (stores LINE user ID)
ALTER TABLE public.society_events
ADD COLUMN IF NOT EXISTS updated_by TEXT;

-- Add updated_by_name column (stores display name for quick access)
ALTER TABLE public.society_events
ADD COLUMN IF NOT EXISTS updated_by_name TEXT;

-- Add comment explaining the columns
COMMENT ON COLUMN public.society_events.updated_by IS 'LINE user ID of the person who last modified this event';
COMMENT ON COLUMN public.society_events.updated_by_name IS 'Display name of the person who last modified this event';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'society_events'
  AND column_name IN ('updated_by', 'updated_by_name', 'updated_at')
ORDER BY column_name;
