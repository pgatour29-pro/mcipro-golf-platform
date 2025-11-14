-- =====================================================
-- ADD MISSING NAME COLUMNS TO SOCIETY_EVENTS
-- These are referenced in code but missing from schema
-- =====================================================

-- Add course_name column (currently only has course_id UUID)
ALTER TABLE society_events
ADD COLUMN IF NOT EXISTS course_name TEXT;

COMMENT ON COLUMN society_events.course_name IS 'Name of the golf course (text). course_id stores the UUID reference.';

-- Add organizer_name column (currently only has organizer_id UUID)
ALTER TABLE society_events
ADD COLUMN IF NOT EXISTS organizer_name TEXT;

COMMENT ON COLUMN society_events.organizer_name IS 'Display name of the event organizer. organizer_id stores the UUID reference.';

-- Create indexes for name columns (useful for searching/filtering)
CREATE INDEX IF NOT EXISTS idx_society_events_course_name ON society_events(course_name);
CREATE INDEX IF NOT EXISTS idx_society_events_organizer_name ON society_events(organizer_name);

-- Verification query
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'society_events'
  AND column_name IN ('course_name', 'organizer_name')
ORDER BY column_name;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Missing name columns added successfully!';
  RAISE NOTICE '   - course_name (text) added';
  RAISE NOTICE '   - organizer_name (text) added';
  RAISE NOTICE '   - Indexes created for both columns';
END $$;
