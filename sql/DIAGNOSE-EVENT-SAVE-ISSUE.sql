-- =====================================================
-- DIAGNOSE EVENT SAVE ISSUE
-- Check if society_events table has the correct columns
-- =====================================================

-- Check current columns in society_events table
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'society_events'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Expected columns (what the code is trying to insert):
-- - title (TEXT) instead of name
-- - event_date (DATE) instead of date
-- - format (TEXT) - new column
-- - entry_fee (INTEGER) instead of base_fee
-- - max_participants (INTEGER) instead of max_players
-- - description (TEXT) instead of notes
-- - start_time (TIME or TIMESTAMPTZ)
-- - creator_id (TEXT)
-- - creator_type (TEXT)
-- - is_private (BOOLEAN)

-- Check if old column names exist that should be renamed
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'society_events' AND column_name = 'name')
        THEN '❌ OLD: "name" column exists (should be "title")'
        ELSE '✅ GOOD: "name" column does not exist'
    END AS name_check,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'society_events' AND column_name = 'date')
        THEN '❌ OLD: "date" column exists (should be "event_date")'
        ELSE '✅ GOOD: "date" column does not exist'
    END AS date_check,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'society_events' AND column_name = 'base_fee')
        THEN '❌ OLD: "base_fee" column exists (should be "entry_fee")'
        ELSE '✅ GOOD: "base_fee" column does not exist'
    END AS fee_check,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'society_events' AND column_name = 'max_players')
        THEN '❌ OLD: "max_players" column exists (should be "max_participants")'
        ELSE '✅ GOOD: "max_players" column does not exist'
    END AS max_check,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'society_events' AND column_name = 'notes')
        THEN '❌ OLD: "notes" column exists (should be "description")'
        ELSE '✅ GOOD: "notes" column does not exist'
    END AS notes_check;

-- Check if new column names exist
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'society_events' AND column_name = 'title')
        THEN '✅ GOOD: "title" column exists'
        ELSE '❌ MISSING: "title" column does not exist'
    END AS title_check,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'society_events' AND column_name = 'event_date')
        THEN '✅ GOOD: "event_date" column exists'
        ELSE '❌ MISSING: "event_date" column does not exist'
    END AS event_date_check,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'society_events' AND column_name = 'format')
        THEN '✅ GOOD: "format" column exists'
        ELSE '❌ MISSING: "format" column does not exist'
    END AS format_check,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'society_events' AND column_name = 'entry_fee')
        THEN '✅ GOOD: "entry_fee" column exists'
        ELSE '❌ MISSING: "entry_fee" column does not exist'
    END AS entry_fee_check,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'society_events' AND column_name = 'max_participants')
        THEN '✅ GOOD: "max_participants" column exists'
        ELSE '❌ MISSING: "max_participants" column does not exist'
    END AS max_participants_check,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'society_events' AND column_name = 'description')
        THEN '✅ GOOD: "description" column exists'
        ELSE '❌ MISSING: "description" column does not exist'
    END AS description_check,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'society_events' AND column_name = 'start_time')
        THEN '✅ GOOD: "start_time" column exists'
        ELSE '❌ MISSING: "start_time" column does not exist'
    END AS start_time_check,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'society_events' AND column_name = 'creator_id')
        THEN '✅ GOOD: "creator_id" column exists'
        ELSE '❌ MISSING: "creator_id" column does not exist'
    END AS creator_id_check,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'society_events' AND column_name = 'creator_type')
        THEN '✅ GOOD: "creator_type" column exists'
        ELSE '❌ MISSING: "creator_type" column does not exist'
    END AS creator_type_check,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'society_events' AND column_name = 'is_private')
        THEN '✅ GOOD: "is_private" column exists'
        ELSE '❌ MISSING: "is_private" column does not exist'
    END AS is_private_check;

-- Count existing events
SELECT COUNT(*) AS total_events FROM society_events;
