-- ============================================================================
-- FIX ALL GUEST IDs - COMPLETE AUTOMATED MIGRATION
-- ============================================================================
-- This script will:
-- 1. Find all users with BOTH guest ID and real LINE ID
-- 2. Migrate ALL their data in bulk
-- 3. Delete guest profiles
-- 4. Add prevention measures
-- ============================================================================

-- STEP 1: Create temporary table of duplicates (guest + real profiles)
CREATE TEMP TABLE duplicate_users AS
WITH guest_profiles AS (
    SELECT
        line_user_id as guest_id,
        LOWER(TRIM(REGEXP_REPLACE(name, '\s+', ' ', 'g'))) as normalized_name,
        name as guest_name
    FROM public.user_profiles
    WHERE line_user_id LIKE 'TRGG-GUEST%'
),
real_profiles AS (
    SELECT
        line_user_id as real_id,
        LOWER(TRIM(REGEXP_REPLACE(name, '\s+', ' ', 'g'))) as normalized_name,
        name as real_name
    FROM public.user_profiles
    WHERE line_user_id LIKE 'U%'
)
SELECT
    gp.guest_id,
    gp.guest_name,
    rp.real_id,
    rp.real_name
FROM guest_profiles gp
JOIN real_profiles rp ON gp.normalized_name = rp.normalized_name;

-- Show what we found
SELECT 'Found duplicates' as status, COUNT(*) as duplicate_count FROM duplicate_users;
SELECT * FROM duplicate_users ORDER BY guest_name;

-- STEP 2: Migrate rounds
UPDATE public.rounds r
SET golfer_id = d.real_id
FROM duplicate_users d
WHERE r.golfer_id = d.guest_id;

SELECT 'Rounds migrated' as step, COUNT(*) as count
FROM public.rounds
WHERE golfer_id IN (SELECT real_id FROM duplicate_users);

-- STEP 3: Migrate scorecards
UPDATE public.scorecards s
SET player_id = d.real_id
FROM duplicate_users d
WHERE s.player_id = d.guest_id;

SELECT 'Scorecards migrated' as step, COUNT(*) as count
FROM public.scorecards
WHERE player_id IN (SELECT real_id FROM duplicate_users);

-- STEP 4: Migrate event registrations
UPDATE public.event_registrations er
SET player_id = d.real_id
FROM duplicate_users d
WHERE er.player_id = d.guest_id;

SELECT 'Event registrations migrated' as step, COUNT(*) as count
FROM public.event_registrations
WHERE player_id IN (SELECT real_id FROM duplicate_users);

-- STEP 5: Migrate society members - just update the golfer_id
UPDATE public.society_members sm
SET golfer_id = d.real_id
FROM duplicate_users d
WHERE sm.golfer_id = d.guest_id;

SELECT 'Society memberships migrated' as step, COUNT(*) as count
FROM public.society_members
WHERE golfer_id IN (SELECT real_id FROM duplicate_users);

-- STEP 6: Migrate event join requests
UPDATE public.event_join_requests ejr
SET golfer_id = d.real_id
FROM duplicate_users d
WHERE ejr.golfer_id = d.guest_id;

SELECT 'Join requests migrated' as step, COUNT(*) as count
FROM public.event_join_requests
WHERE golfer_id IN (SELECT real_id FROM duplicate_users);

-- STEP 7: Migrate golf buddies (both buddy_id and user_id)
UPDATE public.golf_buddies gb
SET buddy_id = d.real_id
FROM duplicate_users d
WHERE gb.buddy_id = d.guest_id;

UPDATE public.golf_buddies gb
SET user_id = d.real_id
FROM duplicate_users d
WHERE gb.user_id = d.guest_id;

SELECT 'Golf buddies migrated' as step, COUNT(*) as count
FROM public.golf_buddies
WHERE buddy_id IN (SELECT real_id FROM duplicate_users) OR user_id IN (SELECT real_id FROM duplicate_users);

-- STEP 8: Migrate scores table (if exists and has golfer_id column)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'scores' AND column_name = 'golfer_id'
    ) THEN
        UPDATE public.scores s
        SET golfer_id = d.real_id
        FROM duplicate_users d
        WHERE s.golfer_id = d.guest_id;
    END IF;
END $$;

-- STEP 9: Ensure real profiles have correct data (merge from guest profiles if better)
UPDATE public.user_profiles up_real
SET
    profile_data = COALESCE(up_real.profile_data, up_guest.profile_data),
    email = COALESCE(up_real.email, up_guest.email),
    updated_at = NOW()
FROM public.user_profiles up_guest
JOIN duplicate_users d ON up_guest.line_user_id = d.guest_id
WHERE up_real.line_user_id = d.real_id;

-- STEP 10: Delete guest profiles
DELETE FROM public.user_profiles up
USING duplicate_users d
WHERE up.line_user_id = d.guest_id;

SELECT 'Guest profiles deleted' as step, COUNT(*) as count FROM duplicate_users;

-- STEP 11: Add trigger to prevent future guest ID creation
CREATE OR REPLACE FUNCTION prevent_guest_id_creation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.line_user_id LIKE 'TRGG-GUEST%' THEN
        RAISE EXCEPTION 'Guest IDs are not allowed. Users must login with LINE to create profiles.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS no_guest_ids ON user_profiles;
CREATE TRIGGER no_guest_ids
BEFORE INSERT ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION prevent_guest_id_creation();

SELECT 'Trigger created' as step, 'Guest IDs now blocked' as status;

-- STEP 12: Add trigger to auto-sync line_user_id changes across all tables
CREATE OR REPLACE FUNCTION sync_user_id_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.line_user_id IS DISTINCT FROM NEW.line_user_id THEN
        -- Sync across all tables
        UPDATE society_members SET golfer_id = NEW.line_user_id WHERE golfer_id = OLD.line_user_id;
        UPDATE rounds SET golfer_id = NEW.line_user_id WHERE golfer_id = OLD.line_user_id;
        UPDATE scorecards SET player_id = NEW.line_user_id WHERE player_id = OLD.line_user_id;
        UPDATE event_registrations SET player_id = NEW.line_user_id WHERE player_id = OLD.line_user_id;
        UPDATE event_join_requests SET golfer_id = NEW.line_user_id WHERE golfer_id = OLD.line_user_id;
        UPDATE golf_buddies SET buddy_id = NEW.line_user_id WHERE buddy_id = OLD.line_user_id;
        UPDATE golf_buddies SET user_id = NEW.line_user_id WHERE user_id = OLD.line_user_id;

        RAISE NOTICE 'Auto-synced user ID from % to % across all tables', OLD.line_user_id, NEW.line_user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_sync_line_user_id ON user_profiles;
CREATE TRIGGER auto_sync_line_user_id
AFTER UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION sync_user_id_changes();

SELECT 'Sync trigger created' as step, 'Changes now cascade automatically' as status;

-- FINAL VERIFICATION
SELECT '=== MIGRATION COMPLETE ===' as status;
SELECT 'Total duplicates migrated' as metric, COUNT(*) as value FROM duplicate_users
UNION ALL
SELECT 'Guest profiles remaining', COUNT(*) FROM public.user_profiles WHERE line_user_id LIKE 'TRGG-GUEST%'
UNION ALL
SELECT 'Real profiles (U...)', COUNT(*) FROM public.user_profiles WHERE line_user_id LIKE 'U%'
UNION ALL
SELECT 'Rounds with guest IDs', COUNT(*) FROM public.rounds WHERE golfer_id LIKE 'TRGG-GUEST%'
UNION ALL
SELECT 'Rounds with real IDs', COUNT(*) FROM public.rounds WHERE golfer_id LIKE 'U%';

-- Clean up
DROP TABLE IF EXISTS duplicate_users;

-- ============================================================================
-- ✅ MIGRATION COMPLETE
-- ============================================================================
-- All users with both guest ID and real LINE ID have been migrated
-- Triggers installed to prevent future guest IDs and auto-sync changes
-- Guest profiles for users who haven't logged in yet remain unchanged
-- ============================================================================
