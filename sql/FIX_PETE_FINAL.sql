-- ============================================================================
-- FIX PETE PARK - FINAL VERSION WITH COMPLETE VALIDATION
-- ============================================================================
-- Pete's Guest ID: TRGG-GUEST-0793
-- Pete's Real LINE ID: U2b6d976f19bca4b2f4374ae0e10ed873
-- ============================================================================

-- STEP 1: Delete ANY golf_buddies entries that would create self-references after migration
DELETE FROM public.golf_buddies
WHERE (user_id = 'TRGG-GUEST-0793' AND buddy_id = 'TRGG-GUEST-0793')
   OR (user_id = 'TRGG-GUEST-0793' AND buddy_id = 'U2b6d976f19bca4b2f4374ae0e10ed873')
   OR (user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873' AND buddy_id = 'TRGG-GUEST-0793');

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

-- STEP 7: Migrate golf buddies (safe now after deletions)
UPDATE public.golf_buddies
SET buddy_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
WHERE buddy_id = 'TRGG-GUEST-0793';

UPDATE public.golf_buddies
SET user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
WHERE user_id = 'TRGG-GUEST-0793';

-- STEP 8: Delete guest profile
DELETE FROM public.user_profiles
WHERE line_user_id = 'TRGG-GUEST-0793';

-- VERIFY
SELECT '✅ PETE MIGRATION COMPLETE' as status;

SELECT 'Pete rounds (should be 10)' as metric, COUNT(*) as value
FROM public.rounds
WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
UNION ALL
SELECT 'Guest rounds remaining (should be 0)', COUNT(*)
FROM public.rounds
WHERE golfer_id = 'TRGG-GUEST-0793'
UNION ALL
SELECT 'Pete profile exists (should be 1)', COUNT(*)
FROM public.user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
UNION ALL
SELECT 'Guest profile exists (should be 0)', COUNT(*)
FROM public.user_profiles
WHERE line_user_id = 'TRGG-GUEST-0793';
