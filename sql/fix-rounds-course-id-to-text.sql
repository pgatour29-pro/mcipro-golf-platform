-- =====================================================================
-- Fix rounds.course_id column type: UUID → TEXT
-- =====================================================================
-- Problem: course_id stored as UUID but course IDs are TEXT strings
-- Error: "invalid input syntax for type uuid: 'pleasant_valley'"
-- Solution: Change column type to TEXT
-- =====================================================================

-- Check current type
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'rounds' AND column_name = 'course_id';

-- Change course_id from UUID to TEXT
ALTER TABLE rounds
ALTER COLUMN course_id TYPE TEXT USING course_id::TEXT;

-- Verify change
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'rounds' AND column_name = 'course_id';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ rounds.course_id changed from UUID to TEXT';
    RAISE NOTICE '✅ Course IDs can now accept strings like "pleasant_valley"';
    RAISE NOTICE '✅ Rounds will save successfully';
END $$;
