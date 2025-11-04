-- =====================================================================
-- COMPREHENSIVE FIX: Change ALL UUID columns to TEXT
-- =====================================================================
-- Problem: Multiple columns are UUID but need to be TEXT:
--   - rounds.course_id → course IDs are TEXT ("pattaya_country_club")
--   - rounds.golfer_id → LINE user IDs are TEXT ("U2b6d976f...")
--   - courses.id → must match rounds.course_id type
-- Fix: Drop FKs, change all UUID→TEXT, recreate FKs
-- =====================================================================

-- Step 1: Drop all foreign key constraints
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN
        SELECT constraint_name, table_name
        FROM information_schema.table_constraints
        WHERE constraint_type = 'FOREIGN KEY'
        AND (constraint_name LIKE '%course%' OR constraint_name LIKE '%golfer%')
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

-- Step 3: Change rounds.course_id to TEXT
DO $$
BEGIN
    ALTER TABLE rounds
    ALTER COLUMN course_id TYPE TEXT USING NULLIF(course_id::TEXT, 'null');
    RAISE NOTICE '✅ rounds.course_id changed to TEXT';
END $$;

-- Step 4: Change rounds.golfer_id to TEXT
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'rounds' AND column_name = 'golfer_id'
    ) THEN
        -- Check if it's UUID type
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'rounds' AND column_name = 'golfer_id' AND data_type = 'uuid'
        ) THEN
            ALTER TABLE rounds
            ALTER COLUMN golfer_id TYPE TEXT USING NULLIF(golfer_id::TEXT, 'null');
            RAISE NOTICE '✅ rounds.golfer_id changed from UUID to TEXT';
        ELSE
            RAISE NOTICE '✅ rounds.golfer_id already TEXT (no change needed)';
        END IF;
    ELSE
        -- Column doesn't exist, create it as TEXT
        ALTER TABLE rounds ADD COLUMN golfer_id TEXT;
        RAISE NOTICE '✅ rounds.golfer_id created as TEXT';
    END IF;
END $$;

-- Step 5: Change course_holes.course_id to TEXT (if exists)
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

-- Step 6: Recreate foreign key constraints
DO $$
BEGIN
    ALTER TABLE rounds
    ADD CONSTRAINT rounds_course_id_fkey
    FOREIGN KEY (course_id) REFERENCES courses(id)
    ON DELETE SET NULL;
    RAISE NOTICE '✅ rounds FK constraint (course_id) recreated';
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'course_holes'
    ) THEN
        ALTER TABLE course_holes
        ADD CONSTRAINT course_holes_course_id_fkey
        FOREIGN KEY (course_id) REFERENCES courses(id)
        ON DELETE CASCADE;
        RAISE NOTICE '✅ course_holes FK constraint recreated';
    END IF;
END $$;

-- Verification query
SELECT
    table_name,
    column_name,
    data_type,
    CASE
        WHEN data_type = 'text' THEN '✅'
        ELSE '❌'
    END as status
FROM information_schema.columns
WHERE (table_name = 'courses' AND column_name = 'id')
   OR (table_name = 'rounds' AND column_name = 'course_id')
   OR (table_name = 'rounds' AND column_name = 'golfer_id')
   OR (table_name = 'course_holes' AND column_name = 'course_id')
ORDER BY table_name, column_name;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ ALL UUID COLUMNS FIXED TO TEXT';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ courses.id → TEXT';
    RAISE NOTICE '✅ rounds.course_id → TEXT';
    RAISE NOTICE '✅ rounds.golfer_id → TEXT';
    RAISE NOTICE '✅ course_holes.course_id → TEXT';
    RAISE NOTICE '✅ Foreign keys recreated';
    RAISE NOTICE '✅ Rounds will now save successfully!';
    RAISE NOTICE '========================================';
END $$;
