-- ============================================================================
-- FIX PETE PARK - DELETE ALL GOLF BUDDIES, THEN MIGRATE
-- ============================================================================

-- STEP 1: Delete ALL golf_buddies entries involving the guest ID
-- This prevents ANY possibility of constraint violations
DELETE FROM public.golf_buddies
WHERE user_id = 'TRGG-GUEST-0793' OR buddy_id = 'TRGG-GUEST-0793';

-- STEP 2: Migrate rounds
UPDATE public.rounds
SET golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
WHERE golfer_id = 'TRGG-GUEST-0793';

-- STEP 3: Migrate scorecards
UPDATE public.scorecards
SET player_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
WHERE player_id = 'TRGG-GUEST-0793';

-- STEP 4: Migrate event registrations
UPDATE public.event_registrations
SET player_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
WHERE player_id = 'TRGG-GUEST-0793';

-- STEP 5: Migrate society members
UPDATE public.society_members
SET golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
WHERE golfer_id = 'TRGG-GUEST-0793';

-- STEP 6: Migrate join requests
UPDATE public.event_join_requests
SET golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
WHERE golfer_id = 'TRGG-GUEST-0793';

-- STEP 7: Delete guest profile
DELETE FROM public.user_profiles
WHERE line_user_id = 'TRGG-GUEST-0793';

-- VERIFY
SELECT '✅ PETE MIGRATION COMPLETE' as status;

SELECT 'Pete rounds' as metric, COUNT(*) as value
FROM public.rounds
WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
UNION ALL
SELECT 'Pete scorecards', COUNT(*)
FROM public.scorecards
WHERE player_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
UNION ALL
SELECT 'Pete society memberships', COUNT(*)
FROM public.society_members
WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
UNION ALL
SELECT 'Guest rounds remaining', COUNT(*)
FROM public.rounds
WHERE golfer_id = 'TRGG-GUEST-0793'
UNION ALL
SELECT 'Guest profile exists', COUNT(*)
FROM public.user_profiles
WHERE line_user_id = 'TRGG-GUEST-0793';
