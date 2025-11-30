-- =====================================================================
-- MIGRATION SCRIPT: Add Subscription Tier to User Profiles
-- =====================================================================
-- This script adds a 'subscription_tier' column to the user_profiles
-- table to track user subscription levels.
-- =====================================================================

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS subscription_status TEXT; -- e.g., 'active', 'past_due', 'canceled'

-- Add some comments to clarify the purpose of the new columns
COMMENT ON COLUMN public.user_profiles.subscription_tier IS 'The subscription tier of the user (e.g., free, silver, gold, platinum)';
COMMENT ON COLUMN public.user_profiles.subscription_status IS 'The current status of the user''s subscription';

-- Backfill existing users to have a non-null status for consistency
UPDATE public.user_profiles
SET subscription_status = 'active'
WHERE subscription_status IS NULL;


DO $$
BEGIN
    RAISE NOTICE '✅ Migration successful: subscription_tier and subscription_status columns added to user_profiles table.';
END $$;
