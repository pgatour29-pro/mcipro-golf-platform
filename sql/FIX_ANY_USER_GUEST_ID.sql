-- ============================================================================
-- FIX ANY USER - MIGRATE FROM GUEST ID TO REAL LINE ID
-- ============================================================================
-- INSTRUCTIONS:
-- 1. Replace 'GUEST_ID_HERE' with the guest ID (e.g., TRGG-GUEST-0319)
-- 2. Replace 'REAL_LINE_ID_HERE' with the real LINE ID (e.g., U2b6d976f...)
-- 3. Run the entire script
-- ============================================================================

-- Set variables (PostgreSQL doesn't support variables in plain SQL, so use find/replace)
-- GUEST_ID: GUEST_ID_HERE
-- REAL_LINE_ID: REAL_LINE_ID_HERE

-- STEP 1: Check if both profiles exist
SELECT 'Guest Profile' as profile_type, line_user_id, name, profile_data->'golfInfo'->>'handicap' as handicap
FROM public.user_profiles
WHERE line_user_id = 'GUEST_ID_HERE'
UNION ALL
SELECT 'Real Profile' as profile_type, line_user_id, name, profile_data->'golfInfo'->>'handicap' as handicap
FROM public.user_profiles
WHERE line_user_id = 'REAL_LINE_ID_HERE';

-- STEP 2: If real profile doesn't exist, create it from guest profile
INSERT INTO public.user_profiles (line_user_id, name, email, profile_data, created_at, updated_at)
SELECT
    'REAL_LINE_ID_HERE',
    name,
    email,
    profile_data,
    created_at,
    NOW()
FROM public.user_profiles
WHERE line_user_id = 'GUEST_ID_HERE'
ON CONFLICT (line_user_id) DO NOTHING;

-- STEP 3: Migrate rounds
UPDATE public.rounds
SET golfer_id = 'REAL_LINE_ID_HERE'
WHERE golfer_id = 'GUEST_ID_HERE';

-- STEP 4: Migrate scorecards
UPDATE public.scorecards
SET player_id = 'REAL_LINE_ID_HERE'
WHERE player_id = 'GUEST_ID_HERE';

-- STEP 5: Migrate event registrations
UPDATE public.event_registrations
SET player_id = 'REAL_LINE_ID_HERE'
WHERE player_id = 'GUEST_ID_HERE';

-- STEP 6: Migrate society members
UPDATE public.society_members
SET golfer_id = 'REAL_LINE_ID_HERE'
WHERE golfer_id = 'GUEST_ID_HERE';

-- STEP 7: Migrate join requests
UPDATE public.event_join_requests
SET golfer_id = 'REAL_LINE_ID_HERE'
WHERE golfer_id = 'GUEST_ID_HERE';

-- STEP 8: Migrate golf buddies
UPDATE public.golf_buddies
SET buddy_id = 'REAL_LINE_ID_HERE'
WHERE buddy_id = 'GUEST_ID_HERE';

UPDATE public.golf_buddies
SET user_id = 'REAL_LINE_ID_HERE'
WHERE user_id = 'GUEST_ID_HERE';

-- STEP 9: Migrate scores
UPDATE public.scores
SET golfer_id = 'REAL_LINE_ID_HERE'
WHERE golfer_id = 'GUEST_ID_HERE';

-- STEP 10: Delete guest profile
DELETE FROM public.user_profiles
WHERE line_user_id = 'GUEST_ID_HERE';

-- VERIFY
SELECT 'Migration Complete' as status;
SELECT 'Profile' as item, COUNT(*) as count FROM public.user_profiles WHERE line_user_id = 'REAL_LINE_ID_HERE'
UNION ALL
SELECT 'Rounds', COUNT(*) FROM public.rounds WHERE golfer_id = 'REAL_LINE_ID_HERE'
UNION ALL
SELECT 'Scorecards', COUNT(*) FROM public.scorecards WHERE player_id = 'REAL_LINE_ID_HERE'
UNION ALL
SELECT 'Society Memberships', COUNT(*) FROM public.society_members WHERE golfer_id = 'REAL_LINE_ID_HERE'
UNION ALL
SELECT 'Golf Buddies', COUNT(*) FROM public.golf_buddies WHERE buddy_id = 'REAL_LINE_ID_HERE' OR user_id = 'REAL_LINE_ID_HERE';
