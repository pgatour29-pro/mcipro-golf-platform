-- =====================================================================
-- CLEANUP DUPLICATE JOA SOCIETIES
-- =====================================================================
-- Issue: Multiple JOA Golf Pattaya entries exist in society_profiles
-- This causes the society selector modal to show JOA 5 times
-- =====================================================================

BEGIN;

-- STEP 1: View all societies to see duplicates
SELECT
    id,
    organizer_id,
    society_name,
    society_logo,
    description,
    created_at
FROM society_profiles
ORDER BY society_name, created_at;

-- STEP 2: Keep only the JOAGOLFPAT entry, delete all others
-- Delete any JOA entries that are NOT the official JOAGOLFPAT organizer_id
DELETE FROM society_profiles
WHERE society_name ILIKE '%JOA%Golf%Pattaya%'
  AND organizer_id != 'JOAGOLFPAT';

-- STEP 3: Verify JOAGOLFPAT exists, if not create it
INSERT INTO society_profiles (organizer_id, society_name, society_logo, description)
VALUES (
    'JOAGOLFPAT',
    'JOA Golf Pattaya',
    './societylogos/JOAgolf.jpeg',
    'JOA Golf Pattaya Society - Weekly tournaments and events in the Pattaya area'
)
ON CONFLICT (organizer_id) DO UPDATE SET
    society_name = EXCLUDED.society_name,
    society_logo = EXCLUDED.society_logo,
    description = EXCLUDED.description,
    updated_at = NOW();

COMMIT;

-- =====================================================================
-- VERIFICATION
-- =====================================================================

-- Show all societies (should see only TRGG and JOA)
SELECT
    id,
    organizer_id,
    society_name,
    society_logo,
    created_at
FROM society_profiles
ORDER BY society_name;

-- =====================================================================
-- EXPECTED RESULTS:
-- =====================================================================
-- Should see exactly 2 societies:
-- 1. JOA Golf Pattaya (JOAGOLFPAT)
-- 2. Travellers Rest Golf Group (U2b6d976f19bca4b2f4374ae0e10ed873)
--
-- No duplicates, no extra JOA entries
-- =====================================================================
