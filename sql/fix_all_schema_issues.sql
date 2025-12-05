-- ========================================
-- FIX ALL SCHEMA ISSUES
-- 1. Add is_primary_society column to society_members
-- 2. Ensure society_organizer_access table exists with PIN columns
-- ========================================

-- PART 1: Fix society_members table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'society_members'
          AND column_name = 'is_primary_society'
    ) THEN
        ALTER TABLE public.society_members
        ADD COLUMN is_primary_society BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_primary_society column';
    ELSE
        RAISE NOTICE 'is_primary_society column already exists';
    END IF;
END $$;

-- Create unique index for primary society
DROP INDEX IF EXISTS idx_unique_primary_society;
CREATE UNIQUE INDEX idx_unique_primary_society
    ON society_members(golfer_id)
    WHERE is_primary_society = true;

-- PART 2: Ensure society_organizer_access table exists
CREATE TABLE IF NOT EXISTS society_organizer_access (
    organizer_id TEXT PRIMARY KEY,
    super_admin_pin TEXT,
    staff_pin TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PART 3: Recreate the RPC functions
CREATE OR REPLACE FUNCTION set_super_admin_pin(org_id TEXT, new_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO society_organizer_access (organizer_id, super_admin_pin)
    VALUES (org_id, new_pin)
    ON CONFLICT (organizer_id)
    DO UPDATE SET
        super_admin_pin = new_pin,
        updated_at = NOW();
    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION set_staff_pin(org_id TEXT, new_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO society_organizer_access (organizer_id, staff_pin)
    VALUES (org_id, new_pin)
    ON CONFLICT (organizer_id)
    DO UPDATE SET
        staff_pin = new_pin,
        updated_at = NOW();
    RETURN true;
END;
$$;

-- PART 4: Verification
SELECT 'society_members columns' as info, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'society_members'
ORDER BY ordinal_position;

SELECT 'society_organizer_access columns' as info, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'society_organizer_access'
ORDER BY ordinal_position;

SELECT 'RPC Functions' as info, routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('set_super_admin_pin', 'set_staff_pin');
