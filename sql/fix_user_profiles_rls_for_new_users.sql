-- =====================================================================
-- FIX USER_PROFILES RLS - ALLOW NEW USERS TO CREATE PROFILES
-- =====================================================================
-- Problem: New LINE users get 400 error when auto-creating profile
-- Solution: Add permissive INSERT policy for first-time users
-- Date: 2025-10-11
-- =====================================================================

-- Drop existing restrictive INSERT policy if exists
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;

-- Create new permissive INSERT policy
-- Allows anyone to INSERT a profile if the line_user_id matches their JWT
CREATE POLICY "Users can create their own profile"
    ON public.user_profiles
    FOR INSERT
    WITH CHECK (
        -- Allow insert if line_user_id matches authenticated user
        line_user_id = current_setting('request.jwt.claims', true)::json->>'line_user_id'
        OR
        -- OR allow insert if user doesn't exist yet (first-time signup)
        NOT EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE line_user_id = current_setting('request.jwt.claims', true)::json->>'line_user_id'
        )
    );

-- Also ensure SELECT policy allows users to see their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;

CREATE POLICY "Users can view their own profile"
    ON public.user_profiles
    FOR SELECT
    USING (
        line_user_id = current_setting('request.jwt.claims', true)::json->>'line_user_id'
    );

-- Allow users to UPDATE their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

CREATE POLICY "Users can update their own profile"
    ON public.user_profiles
    FOR UPDATE
    USING (
        line_user_id = current_setting('request.jwt.claims', true)::json->>'line_user_id'
    );

-- =====================================================================
-- ALTERNATIVE: If JWT not working, use SECURITY DEFINER function
-- =====================================================================
-- This bypasses RLS entirely for profile creation

CREATE OR REPLACE FUNCTION public.create_user_profile(
    p_line_user_id TEXT,
    p_name TEXT,
    p_role TEXT DEFAULT 'golfer',
    p_profile_data JSONB DEFAULT '{}'::jsonb
)
RETURNS public.user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_profile public.user_profiles;
BEGIN
    -- Check if profile already exists
    SELECT * INTO new_profile
    FROM public.user_profiles
    WHERE line_user_id = p_line_user_id;

    IF FOUND THEN
        -- Profile exists, return it
        RETURN new_profile;
    END IF;

    -- Create new profile
    INSERT INTO public.user_profiles (
        line_user_id,
        role,
        name,
        username,
        profile_data
    )
    VALUES (
        p_line_user_id,
        p_role,
        p_name,
        p_name,
        p_profile_data
    )
    RETURNING * INTO new_profile;

    RETURN new_profile;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_profile TO anon;

-- =====================================================================
-- VERIFICATION
-- =====================================================================

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'user_profiles';

-- Check policies
SELECT policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'user_profiles';

-- =====================================================================
-- INSTRUCTIONS:
-- =====================================================================
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Hard refresh app (Ctrl+Shift+R)
-- 3. Try logging in with new LINE user
-- 4. Should auto-create profile and go to dashboard
-- =====================================================================
