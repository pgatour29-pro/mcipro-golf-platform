-- =====================================================================
-- SETUP SOCIETIES: TRGG + JOA (Clean working version)
-- =====================================================================
-- Run this entire script in Supabase SQL Editor
-- =====================================================================

-- STEP 1: Clean up duplicate societies
DELETE FROM society_profiles
WHERE society_name ILIKE '%JOA%'
   OR society_name ILIKE '%Pattaya%';

-- Keep only the original TRGG
DELETE FROM society_profiles
WHERE society_name ILIKE '%Travellers%Rest%'
  AND organizer_id != 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- STEP 2: Create TRGG society
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

-- STEP 3: Create JOA society
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

-- STEP 4: Set Pete as ADMIN
UPDATE user_profiles
SET
    role = 'admin',
    updated_at = NOW()
WHERE line_user_id = 'pgatour29';

-- STEP 5: Link existing events to TRGG society (if they exist and aren't linked)
UPDATE society_events
SET society_id = (SELECT id FROM society_profiles WHERE organizer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873')
WHERE society_id IS NULL
  AND (organizer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873' OR organizer_name ILIKE '%Travellers%');

-- =====================================================================
-- VERIFICATION QUERIES (Results will show below)
-- =====================================================================

-- Show all societies (should be exactly 2)
SELECT
    id,
    organizer_id,
    society_name,
    created_at
FROM society_profiles
ORDER BY society_name;

-- Show Pete's profile (role should be 'admin')
SELECT
    line_user_id,
    name,
    role,
    email
FROM user_profiles
WHERE line_user_id = 'pgatour29';

-- Show event counts per society
SELECT
    sp.society_name,
    COUNT(se.id) as event_count
FROM society_profiles sp
LEFT JOIN society_events se ON se.society_id = sp.id
GROUP BY sp.id, sp.society_name
ORDER BY sp.society_name;

-- =====================================================================
-- EXPECTED RESULTS:
-- 1. society_profiles: 2 rows (TRGG + JOA)
-- 2. Pete's role: 'admin'
-- 3. Events: TRGG should have 36 events, JOA should have 0
-- =====================================================================
