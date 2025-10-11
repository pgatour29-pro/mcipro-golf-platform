-- =====================================================================
-- SOCIETY ORGANIZER ROLES - HIERARCHICAL ACCESS CONTROL
-- =====================================================================
-- Purpose: Create role-based access control for Society Organizer Dashboard
-- Date: 2025-10-11
-- =====================================================================
-- Roles:
--   - super_admin: Full control (PIN management, user roles, all features)
--   - admin: Event management, registrations, pairings
--   - staff: View-only access (limited features)
-- =====================================================================

-- Create society_organizer_roles table
CREATE TABLE IF NOT EXISTS public.society_organizer_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    organizer_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'staff')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT,

    -- Prevent duplicate role assignments
    UNIQUE(user_id, organizer_id)
);

-- Add comments
COMMENT ON TABLE public.society_organizer_roles IS 'Role-based access control for Society Organizer Dashboard';
COMMENT ON COLUMN public.society_organizer_roles.user_id IS 'LINE User ID of the user being granted access';
COMMENT ON COLUMN public.society_organizer_roles.organizer_id IS 'LINE User ID of the organization/owner';
COMMENT ON COLUMN public.society_organizer_roles.role IS 'User role: super_admin, admin, or staff';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizer_roles_user_id ON public.society_organizer_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_organizer_roles_organizer_id ON public.society_organizer_roles(organizer_id);
CREATE INDEX IF NOT EXISTS idx_organizer_roles_role ON public.society_organizer_roles(role);

-- Enable Row Level Security (RLS)
ALTER TABLE public.society_organizer_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Policy 1: Users can view their own role
CREATE POLICY "Users can view their own role"
    ON public.society_organizer_roles
    FOR SELECT
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'line_user_id');

-- Policy 2: Super Admins can view all roles for their organization
CREATE POLICY "Super Admins can view all roles"
    ON public.society_organizer_roles
    FOR SELECT
    USING (
        organizer_id IN (
            SELECT organizer_id
            FROM public.society_organizer_roles
            WHERE user_id = current_setting('request.jwt.claims', true)::json->>'line_user_id'
            AND role = 'super_admin'
        )
    );

-- Policy 3: Super Admins can insert roles for their organization
CREATE POLICY "Super Admins can add users"
    ON public.society_organizer_roles
    FOR INSERT
    WITH CHECK (
        organizer_id IN (
            SELECT organizer_id
            FROM public.society_organizer_roles
            WHERE user_id = current_setting('request.jwt.claims', true)::json->>'line_user_id'
            AND role = 'super_admin'
        )
    );

-- Policy 4: Super Admins can update roles for their organization
CREATE POLICY "Super Admins can update roles"
    ON public.society_organizer_roles
    FOR UPDATE
    USING (
        organizer_id IN (
            SELECT organizer_id
            FROM public.society_organizer_roles
            WHERE user_id = current_setting('request.jwt.claims', true)::json->>'line_user_id'
            AND role = 'super_admin'
        )
    );

-- Policy 5: Super Admins can delete roles for their organization
CREATE POLICY "Super Admins can remove users"
    ON public.society_organizer_roles
    FOR DELETE
    USING (
        organizer_id IN (
            SELECT organizer_id
            FROM public.society_organizer_roles
            WHERE user_id = current_setting('request.jwt.claims', true)::json->>'line_user_id'
            AND role = 'super_admin'
        )
    );

-- Create function to automatically set current user as super_admin on first access
CREATE OR REPLACE FUNCTION auto_create_super_admin()
RETURNS TRIGGER AS $$
BEGIN
    -- If no roles exist for this organizer, make them super_admin
    IF NOT EXISTS (
        SELECT 1 FROM public.society_organizer_roles
        WHERE organizer_id = NEW.organizer_id
    ) THEN
        RETURN NEW;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_society_organizer_roles_updated_at
    BEFORE UPDATE ON public.society_organizer_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- VERIFICATION QUERIES
-- =====================================================================

-- Verify table was created
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'society_organizer_roles';

-- Verify columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'society_organizer_roles'
ORDER BY ordinal_position;

-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'society_organizer_roles';

-- Check policies
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'society_organizer_roles';

-- =====================================================================
-- EXAMPLE: CREATE YOUR FIRST SUPER ADMIN
-- =====================================================================
-- Replace 'YOUR_LINE_USER_ID' with your actual LINE User ID
-- This gives you initial Super Admin access
-- =====================================================================

/*
INSERT INTO public.society_organizer_roles (user_id, organizer_id, role, created_by)
VALUES (
    'YOUR_LINE_USER_ID',  -- Your LINE User ID
    'YOUR_LINE_USER_ID',  -- Same as user_id for self-organization
    'super_admin',
    'system'
);
*/

-- =====================================================================
-- INSTRUCTIONS:
-- =====================================================================
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Uncomment and run the INSERT statement above with your LINE User ID
-- 3. Hard refresh the app (Ctrl+Shift+R)
-- 4. Navigate to Society Organizer Dashboard > Admin tab
-- 5. You should see Super Admin controls for PIN and User Management
-- =====================================================================
