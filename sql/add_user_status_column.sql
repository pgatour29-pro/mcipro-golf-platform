-- =====================================================================
-- MIGRATION SCRIPT: Add User Status to User Profiles
-- =====================================================================
-- This script adds a 'user_status' column to the user_profiles table
-- to track the active/suspended/deleted status of a user.
-- This is distinct from subscription status or caddy approval status.
-- =====================================================================

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS user_status TEXT DEFAULT 'active';

COMMENT ON COLUMN public.user_profiles.user_status IS 'The current operational status of the user (e.g., active, suspended, deleted)';

-- Backfill existing users to have a non-null status for consistency
UPDATE public.user_profiles
SET user_status = 'active'
WHERE user_status IS NULL;

DO $$
BEGIN
    RAISE NOTICE '✅ Migration successful: user_status column added to user_profiles table.';
END $$;
