-- =====================================================
-- ADD MISSING organizer_id COLUMN TO rounds TABLE
-- =====================================================
-- This column is needed for society event scorecards to work
-- The code already tries to save it, but the column didn't exist

-- Add the column if it doesn't exist
ALTER TABLE rounds
ADD COLUMN IF NOT EXISTS organizer_id TEXT;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_rounds_organizer ON rounds(organizer_id);

-- Add index for society_event_id too (if not exists)
CREATE INDEX IF NOT EXISTS idx_rounds_society_event ON rounds(society_event_id);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'organizer_id column added to rounds table';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'This allows society organizers to query rounds for their events';
    RAISE NOTICE 'Existing rounds will have NULL organizer_id';
    RAISE NOTICE 'New rounds will save organizer_id correctly';
END $$;
