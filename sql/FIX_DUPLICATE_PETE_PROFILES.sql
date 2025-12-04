-- ============================================================================
-- FIX DUPLICATE PETE PROFILES
-- ============================================================================
-- Problem: Pete has 2 profiles:
--   1. TRGG-GUEST-0793 (guest profile used in live scorecard)
--   2. U2b6d976f19bca4b2f4374ae0e10ed873 (real LINE profile)
-- Solution: Keep the real LINE profile, delete the guest profile
-- ============================================================================

-- STEP 1: Check both profiles
SELECT
    line_user_id,
    name,
    email,
    profile_data->'golfInfo'->>'handicap' as handicap,
    profile_data,
    created_at
FROM public.user_profiles
WHERE
    line_user_id IN ('TRGG-GUEST-0793', 'U2b6d976f19bca4b2f4374ae0e10ed873')
ORDER BY line_user_id;

-- STEP 2: Make sure real LINE profile has correct handicap
UPDATE public.user_profiles
SET profile_data = jsonb_set(
    COALESCE(profile_data, '{}'::jsonb),
    '{golfInfo,handicap}',
    '3.8'::jsonb
)
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- STEP 3: Update any rounds that used the guest ID to use the real LINE ID
UPDATE public.rounds
SET golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
WHERE golfer_id = 'TRGG-GUEST-0793';

-- STEP 4: Update any scorecards that used the guest ID
UPDATE public.scorecards
SET player_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
WHERE player_id = 'TRGG-GUEST-0793';

-- STEP 5: Update any event registrations
UPDATE public.event_registrations
SET player_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
WHERE player_id = 'TRGG-GUEST-0793';

-- STEP 6: Update any society_members entries
UPDATE public.society_members
SET golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
WHERE golfer_id = 'TRGG-GUEST-0793';

-- STEP 7: Update any event_join_requests
UPDATE public.event_join_requests
SET golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
WHERE golfer_id = 'TRGG-GUEST-0793';

-- STEP 8: Delete the guest profile
DELETE FROM public.user_profiles
WHERE line_user_id = 'TRGG-GUEST-0793';

-- VERIFY: Check Pete's profile
SELECT
    line_user_id,
    name,
    profile_data->'golfInfo'->>'handicap' as handicap
FROM public.user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- VERIFY: Check Pete's rounds are now under correct ID
SELECT
    COUNT(*) as round_count,
    MAX(created_at) as latest_round
FROM public.rounds
WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- ============================================================================
-- DONE. Pete now has a single profile with his real LINE user ID.
-- Clear the profiles cache in the app: localStorage.removeItem('mcipro_all_profiles_cache')
-- ============================================================================
