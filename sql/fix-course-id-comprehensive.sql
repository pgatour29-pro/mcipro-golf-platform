-- =====================================================================
-- Comprehensive Fix: Change all course_id columns from UUID → TEXT
-- =====================================================================
-- Problem: course IDs are TEXT strings but database uses UUID
-- Fix: Drop all FK constraints, change types, recreate constraints
-- =====================================================================

-- Step 1: Find and drop all foreign key constraints to courses.id
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN
        SELECT constraint_name, table_name
        FROM information_schema.table_constraints
        WHERE constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%course%'
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I',
            constraint_record.table_name,
            constraint_record.constraint_name);
        RAISE NOTICE 'Dropped constraint: %.%', constraint_record.table_name, constraint_record.constraint_name;
    END LOOP;
END $$;

-- Step 2: Change courses.id to TEXT
DO $$
BEGIN
    ALTER TABLE courses
    ALTER COLUMN id TYPE TEXT;
    RAISE NOTICE '✅ courses.id changed to TEXT';
END $$;

-- Step 3: Change all referencing columns to TEXT
-- rounds.course_id
DO $$
BEGIN
    ALTER TABLE rounds
    ALTER COLUMN course_id TYPE TEXT USING NULLIF(course_id::TEXT, 'null');
    RAISE NOTICE '✅ rounds.course_id changed to TEXT';
END $$;

-- course_holes.course_id (if exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'course_holes' AND column_name = 'course_id'
    ) THEN
        ALTER TABLE course_holes
        ALTER COLUMN course_id TYPE TEXT;
        RAISE NOTICE '✅ course_holes.course_id changed to TEXT';
    END IF;
END $$;

-- Step 4: Recreate foreign key constraints
DO $$
BEGIN
    ALTER TABLE rounds
    ADD CONSTRAINT rounds_course_id_fkey
    FOREIGN KEY (course_id) REFERENCES courses(id)
    ON DELETE SET NULL;
    RAISE NOTICE '✅ rounds FK constraint recreated';
END $$;

DO $$
BEGIN
    ALTER TABLE course_holes
    ADD CONSTRAINT course_holes_course_id_fkey
    FOREIGN KEY (course_id) REFERENCES courses(id)
    ON DELETE CASCADE;
    RAISE NOTICE '✅ course_holes FK constraint recreated';
END $$;

-- Verification query
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE (table_name = 'courses' AND column_name = 'id')
   OR (table_name = 'rounds' AND column_name = 'course_id')
   OR (table_name = 'course_holes' AND column_name = 'course_id')
ORDER BY table_name, column_name;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ ALL COURSE ID COLUMNS FIXED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ courses.id → TEXT';
    RAISE NOTICE '✅ rounds.course_id → TEXT';
    RAISE NOTICE '✅ course_holes.course_id → TEXT';
    RAISE NOTICE '✅ Foreign keys recreated';
    RAISE NOTICE '✅ Rounds will now save successfully!';
    RAISE NOTICE '========================================';
END $$;
