-- ============================================================================
-- ADD SPECIAL REQUESTS COLUMN TO EVENT_REGISTRATIONS
-- ============================================================================
-- Date: December 21, 2025
-- Purpose: Track special requests from golfers during event registration
-- ============================================================================

-- Add special_requests JSONB column
ALTER TABLE event_registrations
    ADD COLUMN IF NOT EXISTS special_requests JSONB DEFAULT '{}';

-- Expected JSON structure:
-- {
--   "earlyTeeTime": boolean,      -- Prefers early tee time
--   "dietaryRestriction": boolean, -- Has dietary restrictions
--   "mobilityAssistance": boolean, -- Needs mobility assistance
--   "otherNotes": string          -- Free text for other requests
-- }

-- Add index for filtering special requests
CREATE INDEX IF NOT EXISTS idx_event_registrations_special_requests
    ON event_registrations USING gin(special_requests);

-- Example query to find players with dietary restrictions:
-- SELECT * FROM event_registrations
-- WHERE (special_requests->>'dietaryRestriction')::boolean = true;

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'event_registrations'
  AND column_name = 'special_requests';
