-- ============================================================================
-- FIX PETE PARK - EXACT IDs, NO NAME MATCHING
-- ============================================================================
-- Pete's Guest ID: TRGG-GUEST-0793
-- Pete's Real LINE ID: U2b6d976f19bca4b2f4374ae0e10ed873
-- ============================================================================

-- Migrate rounds
UPDATE public.rounds
SET golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
WHERE golfer_id = 'TRGG-GUEST-0793';

-- Migrate scorecards
UPDATE public.scorecards
SET player_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
WHERE player_id = 'TRGG-GUEST-0793';

-- Migrate event registrations
UPDATE public.event_registrations
SET player_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
WHERE player_id = 'TRGG-GUEST-0793';

-- Migrate society members
UPDATE public.society_members
SET golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
WHERE golfer_id = 'TRGG-GUEST-0793';

-- Migrate join requests
UPDATE public.event_join_requests
SET golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
WHERE golfer_id = 'TRGG-GUEST-0793';

-- Migrate golf buddies (delete self-referencing entries first)
DELETE FROM public.golf_buddies
WHERE user_id = 'TRGG-GUEST-0793' AND buddy_id = 'TRGG-GUEST-0793';

UPDATE public.golf_buddies
SET buddy_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
WHERE buddy_id = 'TRGG-GUEST-0793';

UPDATE public.golf_buddies
SET user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
WHERE user_id = 'TRGG-GUEST-0793';

-- Delete guest profile
DELETE FROM public.user_profiles
WHERE line_user_id = 'TRGG-GUEST-0793';

-- VERIFY
SELECT '✅ Pete Fixed' as status;
SELECT COUNT(*) as pete_rounds FROM public.rounds WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';
SELECT COUNT(*) as guest_rounds_remaining FROM public.rounds WHERE golfer_id = 'TRGG-GUEST-0793';
