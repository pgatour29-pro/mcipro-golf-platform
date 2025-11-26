-- =====================================================================
-- COMPLETE SETUP: Society Selector Modal with TRGG + JOA
-- =====================================================================
-- Purpose: Ensure Pete (pgatour29) sees both societies in selector modal
-- Expected: Society selector shows 2 societies when switching to organizer mode
-- =====================================================================

BEGIN;

-- =====================================================================
-- STEP 1: Clean up ALL duplicate societies (fresh start)
-- =====================================================================

-- First, let's see what we have (for debugging)
DO $$
BEGIN
    RAISE NOTICE '=== BEFORE CLEANUP ===';
END $$;

SELECT
    id,
    organizer_id,
    society_name,
    created_at
FROM society_profiles
ORDER BY society_name, created_at;

-- Delete ALL JOA duplicates first
DELETE FROM society_profiles
WHERE society_name ILIKE '%JOA%'
   OR society_name ILIKE '%Pattaya%'
   OR organizer_id LIKE '%JOA%';

-- Also clean up any test/duplicate TRGG entries (keep only the original)
DELETE FROM society_profiles
WHERE society_name ILIKE '%Travellers%Rest%'
  AND organizer_id != 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- =====================================================================
-- STEP 2: Create the TWO official societies
-- =====================================================================

-- Society 1: Travellers Rest Golf Group (TRGG)
INSERT INTO society_profiles (
    organizer_id,
    society_name,
    society_logo,
    description
)
VALUES (
    'U2b6d976f19bca4b2f4374ae0e10ed873',
    'Travellers Rest Golf Group',
    './societylogos/trgg.jpg',
    'Travellers Rest Golf Group - Regular tournaments and social golf events'
)
ON CONFLICT (organizer_id)
DO UPDATE SET
    society_name = EXCLUDED.society_name,
    society_logo = EXCLUDED.society_logo,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Society 2: JOA Golf Pattaya
INSERT INTO society_profiles (
    organizer_id,
    society_name,
    society_logo,
    description
)
VALUES (
    'JOAGOLFPAT',
    'JOA Golf Pattaya',
    './societylogos/JOAgolf.jpeg',
    'JOA Golf Pattaya Society - Weekly tournaments and events in the Pattaya area'
)
ON CONFLICT (organizer_id)
DO UPDATE SET
    society_name = EXCLUDED.society_name,
    society_logo = EXCLUDED.society_logo,
    description = EXCLUDED.description,
    updated_at = NOW();

-- =====================================================================
-- STEP 3: Set Pete as ADMIN (to see all societies)
-- =====================================================================

-- Update Pete's role to 'admin'
UPDATE user_profiles
SET
    role = 'admin',
    updated_at = NOW()
WHERE line_user_id = 'pgatour29';

-- Verify Pete's profile was updated
DO $$
DECLARE
    pete_role TEXT;
BEGIN
    SELECT role INTO pete_role
    FROM user_profiles
    WHERE line_user_id = 'pgatour29';

    IF pete_role = 'admin' THEN
        RAISE NOTICE '✅ Pete role set to: %', pete_role;
    ELSE
        RAISE WARNING '❌ Pete role is: % (expected: admin)', COALESCE(pete_role, 'NULL');
    END IF;
END $$;

COMMIT;

-- =====================================================================
-- VERIFICATION QUERIES
-- =====================================================================

DO $$
BEGIN
    RAISE NOTICE '=== AFTER SETUP ===';
END $$;

-- 1. Show all societies (should be exactly 2)
SELECT
    '=== ALL SOCIETIES ===' AS section,
    id,
    organizer_id,
    society_name,
    society_logo,
    created_at
FROM society_profiles
ORDER BY society_name;

-- 2. Show Pete's user profile
SELECT
    '=== PETE PROFILE ===' AS section,
    line_user_id,
    name,
    role,
    email,
    society_name
FROM user_profiles
WHERE line_user_id = 'pgatour29';

-- 3. Count societies by name (should all be 1)
SELECT
    '=== DUPLICATE CHECK ===' AS section,
    society_name,
    COUNT(*) as count
FROM society_profiles
GROUP BY society_name
HAVING COUNT(*) > 1;

-- =====================================================================
-- EXPECTED RESULTS
-- =====================================================================
-- 1. society_profiles table should have EXACTLY 2 entries:
--    - Travellers Rest Golf Group (U2b6d976f19bca4b2f4374ae0e10ed873)
--    - JOA Golf Pattaya (JOAGOLFPAT)
--
-- 2. user_profiles for pgatour29:
--    - role: admin
--
-- 3. Duplicate check should return ZERO rows
--
-- 4. After reloading MciPro:
--    - Dev Tools → Switch to "Society Organizer"
--    - Society selector modal appears automatically
--    - Shows 2 societies: TRGG and JOA
--    - Can select either one
--    - Selected society's events load correctly
-- =====================================================================

-- =====================================================================
-- TESTING IN CONSOLE (After running this SQL)
-- =====================================================================
-- After running this SQL, reload MciPro and test:
--
-- 1. Open Dev Tools console
-- 2. Switch to "Society Organizer" mode
-- 3. Run: await SocietySelector.init();
-- 4. Console should show:
--    - "Societies found: 2"
--    - Modal should appear with TRGG and JOA
--
-- 5. Check society data:
--    console.log(SocietySelector.societies);
--    // Should show array with 2 societies
--
-- 6. Check user role:
--    console.log(AppState.currentUser?.role);
--    // Should show: "admin"
-- =====================================================================
