-- =====================================================
-- COMPLETE DATABASE FIX - RUN THIS IN SUPABASE
-- =====================================================
-- This script fixes ALL issues:
-- 1. Upgrades society_organizer_access to two-tier PIN system
-- 2. Creates society_organizer_roles table
-- 3. Adds is_primary_society column
-- 4. Creates all RPC functions
-- =====================================================

-- PART 1: UPGRADE society_organizer_access table
-- Add new columns for two-tier PIN system
ALTER TABLE society_organizer_access
ADD COLUMN IF NOT EXISTS super_admin_pin TEXT,
ADD COLUMN IF NOT EXISTS staff_pin TEXT;

-- Migrate existing access_pin to super_admin_pin
UPDATE society_organizer_access
SET super_admin_pin = access_pin
WHERE super_admin_pin IS NULL AND access_pin IS NOT NULL;

-- Make access_pin nullable (no longer required)
ALTER TABLE society_organizer_access
ALTER COLUMN access_pin DROP NOT NULL;

-- PART 2: Create society_organizer_roles table
CREATE TABLE IF NOT EXISTS society_organizer_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    organizer_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'staff')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, organizer_id)
);

-- Create indexes for society_organizer_roles
CREATE INDEX IF NOT EXISTS idx_society_organizer_roles_user_id
    ON society_organizer_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_society_organizer_roles_organizer_id
    ON society_organizer_roles(organizer_id);

-- Enable RLS on society_organizer_roles
ALTER TABLE society_organizer_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow users to view their own roles" ON society_organizer_roles;
DROP POLICY IF EXISTS "Allow organizers to manage roles" ON society_organizer_roles;

-- Create RLS policies for society_organizer_roles
CREATE POLICY "Allow users to view their own roles"
    ON society_organizer_roles
    FOR SELECT
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Allow organizers to manage roles"
    ON society_organizer_roles
    FOR ALL
    USING (organizer_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- PART 3: Add is_primary_society column to society_members
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

-- PART 4: Drop old PIN functions
DROP FUNCTION IF EXISTS verify_society_organizer_pin(TEXT, TEXT);
DROP FUNCTION IF EXISTS organizer_has_pin(TEXT);
DROP FUNCTION IF EXISTS set_organizer_pin(TEXT, TEXT);

-- PART 5: Create NEW PIN functions for two-tier system

-- Verify PIN and return role
CREATE OR REPLACE FUNCTION verify_society_organizer_pin(org_id TEXT, input_pin TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result TEXT := NULL;
BEGIN
    -- Check super admin PIN
    IF EXISTS (
        SELECT 1 FROM society_organizer_access
        WHERE organizer_id = org_id AND super_admin_pin = input_pin
    ) THEN
        RETURN 'super_admin';
    END IF;

    -- Check staff PIN
    IF EXISTS (
        SELECT 1 FROM society_organizer_access
        WHERE organizer_id = org_id AND staff_pin = input_pin
    ) THEN
        RETURN 'admin';
    END IF;

    -- No match
    RETURN NULL;
END;
$$;

-- Check if organizer has ANY PIN set
CREATE OR REPLACE FUNCTION organizer_has_pin(org_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM society_organizer_access
        WHERE organizer_id = org_id
          AND (super_admin_pin IS NOT NULL OR staff_pin IS NOT NULL)
    );
END;
$$;

-- Set Super Admin PIN
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

-- Set Staff PIN
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

-- Get PIN status
CREATE OR REPLACE FUNCTION get_pin_status(org_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'has_super_admin_pin', (super_admin_pin IS NOT NULL),
        'has_staff_pin', (staff_pin IS NOT NULL)
    )
    INTO result
    FROM society_organizer_access
    WHERE organizer_id = org_id;

    -- If no record exists, return default
    IF result IS NULL THEN
        result := json_build_object(
            'has_super_admin_pin', false,
            'has_staff_pin', false
        );
    END IF;

    RETURN result;
END;
$$;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check society_organizer_access columns
SELECT 'society_organizer_access columns' as info, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'society_organizer_access'
ORDER BY ordinal_position;

-- Check society_organizer_roles columns
SELECT 'society_organizer_roles columns' as info, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'society_organizer_roles'
ORDER BY ordinal_position;

-- Check society_members columns
SELECT 'society_members columns' as info, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'society_members'
ORDER BY ordinal_position;

-- Check RPC functions
SELECT 'RPC Functions' as info, routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('set_super_admin_pin', 'set_staff_pin', 'verify_society_organizer_pin', 'organizer_has_pin', 'get_pin_status');
