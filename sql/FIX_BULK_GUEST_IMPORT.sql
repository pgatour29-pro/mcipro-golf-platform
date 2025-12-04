-- ============================================================================
-- FIX BULK GUEST IMPORT - 2099 USERS WITH GUEST IDs
-- ============================================================================
-- Problem: 2099 society members have TRGG-GUEST-XXXX IDs instead of real LINE IDs
-- This happened during a bulk import on 2025-11-04
-- ============================================================================

-- STEP 1: Find users who have BOTH guest ID AND real LINE ID (duplicates)
WITH guest_profiles AS (
    SELECT line_user_id as guest_id, name, LOWER(TRIM(name)) as normalized_name
    FROM public.user_profiles
    WHERE line_user_id LIKE 'TRGG-GUEST%'
),
real_profiles AS (
    SELECT line_user_id as real_id, name, LOWER(TRIM(name)) as normalized_name
    FROM public.user_profiles
    WHERE line_user_id LIKE 'U%'
)
SELECT
    gp.guest_id,
    gp.name as guest_name,
    rp.real_id,
    rp.name as real_name,
    'DUPLICATE - NEEDS MIGRATION' as action
FROM guest_profiles gp
JOIN real_profiles rp ON gp.normalized_name = rp.normalized_name
ORDER BY gp.guest_id;

-- STEP 2: Count how many users have rounds/data
SELECT
    'Users with rounds' as category,
    COUNT(DISTINCT golfer_id) as count
FROM public.rounds
WHERE golfer_id LIKE 'TRGG-GUEST%'
UNION ALL
SELECT
    'Users with scorecards',
    COUNT(DISTINCT player_id)
FROM public.scorecards
WHERE player_id LIKE 'TRGG-GUEST%'
UNION ALL
SELECT
    'Users with event registrations',
    COUNT(DISTINCT player_id)
FROM public.event_registrations
WHERE player_id LIKE 'TRGG-GUEST%';

-- STEP 3: Strategy Decision
-- Option A: Keep guest profiles for users who haven't logged in yet
-- Option B: Delete all guest profiles and recreate when they login
--
-- RECOMMENDED: Option A (safer - preserves society membership data)

-- Mark all guest profiles as "pending login"
UPDATE public.user_profiles
SET profile_data = jsonb_set(
    COALESCE(profile_data, '{}'::jsonb),
    '{accountStatus}',
    '"pending_line_login"'::jsonb
)
WHERE line_user_id LIKE 'TRGG-GUEST%';

-- STEP 4: For users who HAVE logged in (found in step 1), migrate them
-- This needs to be done individually using FIX_ANY_USER_GUEST_ID.sql
-- Or create a batch migration script

-- ============================================================================
-- PREVENTION: Add database constraint
-- ============================================================================
-- This will prevent future bulk imports with guest IDs

CREATE OR REPLACE FUNCTION prevent_guest_id_creation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.line_user_id LIKE 'TRGG-GUEST%' THEN
        RAISE EXCEPTION 'Guest IDs are not allowed. Users must login with LINE to create profiles.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger (comment out if you want to keep existing guest profiles)
-- CREATE TRIGGER no_guest_ids
-- BEFORE INSERT ON user_profiles
-- FOR EACH ROW
-- EXECUTE FUNCTION prevent_guest_id_creation();

-- ============================================================================
-- AUTOMATED MIGRATION ON LOGIN
-- ============================================================================
-- When a user logs in with LINE, check if a guest profile exists with same name
-- If found, migrate all data from guest ID to real LINE ID
-- This should be handled in the application code (LINE login handler)
-- ============================================================================

-- Sample migration query for when user logs in:
-- WHEN user 'John Smith' logs in with LINE ID 'U123abc456def':
--
-- 1. Find guest profile: SELECT line_user_id FROM user_profiles WHERE name ILIKE '%John%Smith%' AND line_user_id LIKE 'TRGG-GUEST%'
-- 2. If found, run: UPDATE rounds SET golfer_id = 'U123abc456def' WHERE golfer_id = 'TRGG-GUEST-XXXX'
-- 3. Repeat for all tables: scorecards, society_members, event_registrations, etc.
-- 4. Delete guest profile: DELETE FROM user_profiles WHERE line_user_id = 'TRGG-GUEST-XXXX'

-- ============================================================================
-- IMMEDIATE ACTION REQUIRED
-- ============================================================================
-- 1. Run STEP 1 above to find duplicates (users who have both guest and real profiles)
-- 2. For each duplicate, run FIX_ANY_USER_GUEST_ID.sql to migrate
-- 3. Implement automatic migration in LINE login code
-- 4. Add constraint to prevent future guest ID creation
-- ============================================================================
