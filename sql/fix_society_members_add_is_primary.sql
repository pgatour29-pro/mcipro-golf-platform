-- Add is_primary_society column if it doesn't exist
DO $$
BEGIN
    -- Check if column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'society_members'
          AND column_name = 'is_primary_society'
    ) THEN
        -- Add the column
        ALTER TABLE public.society_members
        ADD COLUMN is_primary_society BOOLEAN DEFAULT false;

        RAISE NOTICE '✅ Added is_primary_society column to society_members';
    ELSE
        RAISE NOTICE 'ℹ️  is_primary_society column already exists';
    END IF;
END $$;

-- Create or replace the unique index for primary society
DROP INDEX IF EXISTS idx_unique_primary_society;
CREATE UNIQUE INDEX idx_unique_primary_society
    ON society_members(golfer_id)
    WHERE is_primary_society = true;

RAISE NOTICE '✅ Unique index for primary society created';

-- Show current schema
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'society_members'
ORDER BY ordinal_position;
