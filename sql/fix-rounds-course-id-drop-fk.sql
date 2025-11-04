-- =====================================================================
-- Fix rounds.course_id: Drop foreign key, change UUID → TEXT
-- =====================================================================
-- Problem: course_id has FK constraint to courses.id (both UUID)
-- But course IDs are TEXT strings like "pleasant_valley"
-- Solution: Drop FK, change both columns to TEXT, recreate FK
-- =====================================================================

-- Step 1: Drop the foreign key constraint
ALTER TABLE rounds
DROP CONSTRAINT IF EXISTS rounds_course_id_fkey;

-- Step 2: Change rounds.course_id from UUID to TEXT
ALTER TABLE rounds
ALTER COLUMN course_id TYPE TEXT USING course_id::TEXT;

-- Step 3: Change courses.id from UUID to TEXT
ALTER TABLE courses
ALTER COLUMN id TYPE TEXT;

-- Step 4: Recreate foreign key constraint (optional, for data integrity)
ALTER TABLE rounds
ADD CONSTRAINT rounds_course_id_fkey
FOREIGN KEY (course_id) REFERENCES courses(id)
ON DELETE SET NULL;

-- Verify changes
SELECT 'rounds.course_id type:' as check_name, data_type
FROM information_schema.columns
WHERE table_name = 'rounds' AND column_name = 'course_id'
UNION ALL
SELECT 'courses.id type:' as check_name, data_type
FROM information_schema.columns
WHERE table_name = 'courses' AND column_name = 'id';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Foreign key constraint dropped';
    RAISE NOTICE '✅ rounds.course_id changed to TEXT';
    RAISE NOTICE '✅ courses.id changed to TEXT';
    RAISE NOTICE '✅ Foreign key constraint recreated';
    RAISE NOTICE '✅ Rounds can now save with course IDs like "pleasant_valley"';
END $$;
