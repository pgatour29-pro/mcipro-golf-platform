-- ============================================================================
-- FIX PETE AND GILBERT LINE USER IDS
-- ============================================================================
-- Problem: Pete Park and Gilbert have TRGG-GUEST IDs in user_profiles.line_user_id
-- This causes rounds to save with guest IDs instead of real LINE user IDs
-- Solution: Update their profiles to have correct LINE user IDs
-- ============================================================================

-- First, let's see what we're working with
SELECT
    line_user_id,
    name,
    profile_data->'golfInfo'->>'handicap' as handicap
FROM public.user_profiles
WHERE
    name ILIKE '%Pete%Park%'
    OR name ILIKE '%Gilbert%'
    OR name ILIKE '%Tristan%'
    OR line_user_id IN ('TRGG-GUEST-0793', 'TRGG-GUEST-0319', 'U2b6d976f19bca4b2f4374ae0e10ed873');

-- Update Pete Park's profile with correct LINE user ID
UPDATE public.user_profiles
SET line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
WHERE line_user_id = 'TRGG-GUEST-0793';

-- Update Gilbert's profile with correct LINE user ID
-- NOTE: We need to find Gilbert's real LINE user ID first
-- If Gilbert doesn't have a real LINE user ID yet, we'll need to get it from LINE when he logs in

-- Verify the changes
SELECT
    line_user_id,
    name,
    profile_data->'golfInfo'->>'handicap' as handicap
FROM public.user_profiles
WHERE
    name ILIKE '%Pete%Park%'
    OR name ILIKE '%Gilbert%'
    OR name ILIKE '%Tristan%';

-- ============================================================================
-- NEXT STEPS:
-- 1. Run this script to fix Pete's profile
-- 2. Find Gilbert's real LINE user ID (check when he logs in with LINE)
-- 3. Update Gilbert's profile once we have his real LINE user ID
-- 4. Clear the profiles cache in the app (localStorage)
-- ============================================================================
