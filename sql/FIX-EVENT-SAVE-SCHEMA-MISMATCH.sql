-- =====================================================
-- FIX EVENT SAVE ISSUE - SCHEMA MIGRATION
-- Rename/add columns to match what the code expects
-- =====================================================
--
-- ISSUE: The code is trying to insert into columns that don't exist:
--   - Code uses: title, event_date, format, entry_fee, max_participants, description
--   - Old schema has: name, date, (no format), base_fee, max_players, notes
--
-- SOLUTION: Rename old columns to new names and add missing columns
-- =====================================================

BEGIN;

-- Step 1: Rename 'name' column to 'title' (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'society_events' AND column_name = 'name'
    ) THEN
        ALTER TABLE society_events RENAME COLUMN name TO title;
        RAISE NOTICE '✅ Renamed column "name" to "title"';
    ELSE
        RAISE NOTICE '⚠️ Column "name" does not exist, skipping rename';
    END IF;
END $$;

-- Step 2: Rename 'date' column to 'event_date' (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'society_events' AND column_name = 'date'
    ) THEN
        ALTER TABLE society_events RENAME COLUMN date TO event_date;
        RAISE NOTICE '✅ Renamed column "date" to "event_date"';
    ELSE
        RAISE NOTICE '⚠️ Column "date" does not exist, skipping rename';
    END IF;
END $$;

-- Step 3: Rename 'base_fee' column to 'entry_fee' (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'society_events' AND column_name = 'base_fee'
    ) THEN
        ALTER TABLE society_events RENAME COLUMN base_fee TO entry_fee;
        RAISE NOTICE '✅ Renamed column "base_fee" to "entry_fee"';
    ELSE
        RAISE NOTICE '⚠️ Column "base_fee" does not exist, skipping rename';
    END IF;
END $$;

-- Step 4: Rename 'max_players' column to 'max_participants' (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'society_events' AND column_name = 'max_players'
    ) THEN
        ALTER TABLE society_events RENAME COLUMN max_players TO max_participants;
        RAISE NOTICE '✅ Renamed column "max_players" to "max_participants"';
    ELSE
        RAISE NOTICE '⚠️ Column "max_players" does not exist, skipping rename';
    END IF;
END $$;

-- Step 5: Rename 'notes' column to 'description' (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'society_events' AND column_name = 'notes'
    ) THEN
        ALTER TABLE society_events RENAME COLUMN notes TO description;
        RAISE NOTICE '✅ Renamed column "notes" to "description"';
    ELSE
        RAISE NOTICE '⚠️ Column "notes" does not exist, skipping rename';
    END IF;
END $$;

-- Step 6: Add 'format' column (if it doesn't exist)
ALTER TABLE society_events
ADD COLUMN IF NOT EXISTS format TEXT;

-- Step 7: Add 'start_time' column (if it doesn't exist)
ALTER TABLE society_events
ADD COLUMN IF NOT EXISTS start_time TIME;

-- Step 8: Add 'creator_id' column (if it doesn't exist)
ALTER TABLE society_events
ADD COLUMN IF NOT EXISTS creator_id TEXT;

-- Step 9: Add 'creator_type' column (if it doesn't exist)
ALTER TABLE society_events
ADD COLUMN IF NOT EXISTS creator_type TEXT DEFAULT 'organizer';

-- Step 10: Add 'is_private' column (if it doesn't exist)
ALTER TABLE society_events
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- Step 11: Update indexes (drop old, create new)
DROP INDEX IF EXISTS idx_events_date;
CREATE INDEX IF NOT EXISTS idx_events_event_date ON society_events(event_date);

-- Step 12: Create new indexes for new columns
CREATE INDEX IF NOT EXISTS idx_events_creator_id ON society_events(creator_id);
CREATE INDEX IF NOT EXISTS idx_events_is_private ON society_events(is_private);

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Show all columns after migration
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'society_events'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verify the fix
DO $$
DECLARE
    missing_columns TEXT[] := ARRAY[]::TEXT[];
    old_columns TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check for missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'society_events' AND column_name = 'title') THEN
        missing_columns := array_append(missing_columns, 'title');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'society_events' AND column_name = 'event_date') THEN
        missing_columns := array_append(missing_columns, 'event_date');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'society_events' AND column_name = 'format') THEN
        missing_columns := array_append(missing_columns, 'format');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'society_events' AND column_name = 'entry_fee') THEN
        missing_columns := array_append(missing_columns, 'entry_fee');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'society_events' AND column_name = 'max_participants') THEN
        missing_columns := array_append(missing_columns, 'max_participants');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'society_events' AND column_name = 'description') THEN
        missing_columns := array_append(missing_columns, 'description');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'society_events' AND column_name = 'creator_id') THEN
        missing_columns := array_append(missing_columns, 'creator_id');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'society_events' AND column_name = 'creator_type') THEN
        missing_columns := array_append(missing_columns, 'creator_type');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'society_events' AND column_name = 'is_private') THEN
        missing_columns := array_append(missing_columns, 'is_private');
    END IF;

    -- Check for old columns that should have been renamed
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'society_events' AND column_name = 'name') THEN
        old_columns := array_append(old_columns, 'name (should be title)');
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'society_events' AND column_name = 'date') THEN
        old_columns := array_append(old_columns, 'date (should be event_date)');
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'society_events' AND column_name = 'base_fee') THEN
        old_columns := array_append(old_columns, 'base_fee (should be entry_fee)');
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'society_events' AND column_name = 'max_players') THEN
        old_columns := array_append(old_columns, 'max_players (should be max_participants)');
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'society_events' AND column_name = 'notes') THEN
        old_columns := array_append(old_columns, 'notes (should be description)');
    END IF;

    -- Report results
    IF array_length(missing_columns, 1) IS NULL AND array_length(old_columns, 1) IS NULL THEN
        RAISE NOTICE '========================================';
        RAISE NOTICE '✅ SUCCESS! Schema migration completed!';
        RAISE NOTICE '========================================';
        RAISE NOTICE 'All required columns exist:';
        RAISE NOTICE '  ✅ title';
        RAISE NOTICE '  ✅ event_date';
        RAISE NOTICE '  ✅ format';
        RAISE NOTICE '  ✅ entry_fee';
        RAISE NOTICE '  ✅ max_participants';
        RAISE NOTICE '  ✅ description';
        RAISE NOTICE '  ✅ start_time';
        RAISE NOTICE '  ✅ creator_id';
        RAISE NOTICE '  ✅ creator_type';
        RAISE NOTICE '  ✅ is_private';
        RAISE NOTICE '';
        RAISE NOTICE 'Events should now save successfully!';
        RAISE NOTICE '========================================';
    ELSE
        IF array_length(missing_columns, 1) IS NOT NULL THEN
            RAISE WARNING '❌ Still missing columns: %', array_to_string(missing_columns, ', ');
        END IF;
        IF array_length(old_columns, 1) IS NOT NULL THEN
            RAISE WARNING '❌ Old columns still exist: %', array_to_string(old_columns, ', ');
        END IF;
    END IF;
END $$;
