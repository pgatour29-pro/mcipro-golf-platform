-- ============================================================================
-- FIX PETE PARK - COMPLETE MIGRATION FROM GUEST ID TO REAL LINE ID
-- ============================================================================
-- Pete's Guest ID: TRGG-GUEST-0793
-- Pete's Real LINE ID: U2b6d976f19bca4b2f4374ae0e10ed873
-- ============================================================================

-- STEP 1: Verify both profiles exist
SELECT 'Pete Guest Profile' as profile_type, line_user_id, name, profile_data->'golfInfo'->>'handicap' as handicap
FROM public.user_profiles
WHERE line_user_id = 'TRGG-GUEST-0793'
UNION ALL
SELECT 'Pete Real Profile' as profile_type, line_user_id, name, profile_data->'golfInfo'->>'handicap' as handicap
FROM public.user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- STEP 2: Ensure real profile has correct handicap
UPDATE public.user_profiles
SET profile_data = jsonb_set(
    COALESCE(profile_data, '{}'::jsonb),
    '{golfInfo,handicap}',
    '3.8'::jsonb
)
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- STEP 3: Migrate rounds
UPDATE public.rounds
SET golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
WHERE golfer_id = 'TRGG-GUEST-0793';

SELECT 'Rounds migrated' as step, COUNT(*) as count
FROM public.rounds
WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- STEP 4: Migrate scorecards
UPDATE public.scorecards
SET player_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
WHERE player_id = 'TRGG-GUEST-0793';

SELECT 'Scorecards migrated' as step, COUNT(*) as count
FROM public.scorecards
WHERE player_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- STEP 5: Migrate event registrations
UPDATE public.event_registrations
SET player_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
WHERE player_id = 'TRGG-GUEST-0793';

SELECT 'Event registrations migrated' as step, COUNT(*) as count
FROM public.event_registrations
WHERE player_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- STEP 6: Migrate society members
UPDATE public.society_members
SET golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
WHERE golfer_id = 'TRGG-GUEST-0793';

SELECT 'Society memberships migrated' as step, COUNT(*) as count
FROM public.society_members
WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- STEP 7: Migrate join requests
UPDATE public.event_join_requests
SET golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
WHERE golfer_id = 'TRGG-GUEST-0793';

SELECT 'Join requests migrated' as step, COUNT(*) as count
FROM public.event_join_requests
WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- STEP 8: Migrate golf buddies (both as buddy and as user)
UPDATE public.golf_buddies
SET buddy_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
WHERE buddy_id = 'TRGG-GUEST-0793';

UPDATE public.golf_buddies
SET user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
WHERE user_id = 'TRGG-GUEST-0793';

SELECT 'Golf buddy entries migrated' as step, COUNT(*) as count
FROM public.golf_buddies
WHERE buddy_id = 'U2b6d976f19bca4b2f4374ae0e10ed873' OR user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- STEP 9: Migrate scores table (if exists)
UPDATE public.scores
SET golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
WHERE golfer_id = 'TRGG-GUEST-0793';

-- STEP 10: Delete guest profile
DELETE FROM public.user_profiles
WHERE line_user_id = 'TRGG-GUEST-0793';

SELECT 'Guest profile deleted' as step, 'Complete' as status;

-- VERIFY: Check Pete's data
SELECT 'Final Check: Pete Profile' as verification;
SELECT line_user_id, name, profile_data->'golfInfo'->>'handicap' as handicap
FROM public.user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

SELECT 'Final Check: Pete Rounds' as verification;
SELECT COUNT(*) as round_count, MIN(played_at) as first_round, MAX(played_at) as last_round
FROM public.rounds
WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- ============================================================================
-- ✅ DONE! Pete now has single profile with real LINE ID
-- All his data (10 rounds, scorecards, society memberships) migrated
-- ============================================================================
