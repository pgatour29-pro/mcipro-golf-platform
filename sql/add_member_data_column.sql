-- Add missing member_data column to society_members table
-- This column stores flexible member-specific data like name, handicap, homeClub, etc.

-- Check if column exists first, add if not
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'society_members'
        AND column_name = 'member_data'
    ) THEN
        ALTER TABLE public.society_members
        ADD COLUMN member_data JSONB DEFAULT '{}'::jsonb;

        RAISE NOTICE 'Added member_data column to society_members';
    ELSE
        RAISE NOTICE 'member_data column already exists';
    END IF;
END $$;

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE ON public.society_members TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.society_members TO service_role;
