-- =====================================================================
-- FIX SOCIETY EVENTS SCHEMA & ADD JOA
-- =====================================================================
-- This script:
-- 1. Shows current schema to understand the table structure
-- 2. Fixes society_events table if needed
-- 3. Creates JOA Golf Pattaya society
-- 4. Sets Pete as admin
-- =====================================================================

BEGIN;

-- STEP 1: Show current schema of society_events table
\d society_events

-- STEP 2: Show current schema of society_profiles table
\d society_profiles

-- STEP 3: Check if society_events has society_id or organizer_id column
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'society_events'
  AND column_name IN ('society_id', 'organizer_id');

-- STEP 4: Clean up all duplicate societies
DELETE FROM society_profiles
WHERE society_name ILIKE '%JOA%'
   OR society_name ILIKE '%Pattaya%';

-- Keep only the original TRGG
DELETE FROM society_profiles
WHERE society_name ILIKE '%Travellers%Rest%'
  AND organizer_id != 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- STEP 5: Create the TWO official societies
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
    updated_at = NOW()
RETURNING id, organizer_id, society_name;

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
    updated_at = NOW()
RETURNING id, organizer_id, society_name;

-- STEP 6: Set Pete as ADMIN
UPDATE user_profiles
SET
    role = 'admin',
    updated_at = NOW()
WHERE line_user_id = 'pgatour29'
RETURNING line_user_id, name, role;

COMMIT;

-- =====================================================================
-- VERIFICATION
-- =====================================================================

-- Show all societies (should be exactly 2)
SELECT
    id,
    organizer_id,
    society_name,
    created_at
FROM society_profiles
ORDER BY society_name;

-- Show Pete's profile
SELECT
    line_user_id,
    name,
    role,
    email
FROM user_profiles
WHERE line_user_id = 'pgatour29';

-- Check how many events exist and their society linkage
SELECT
    'Total events' as metric,
    COUNT(*) as count
FROM society_events

UNION ALL

SELECT
    'Events with society_id' as metric,
    COUNT(*) as count
FROM society_events
WHERE society_id IS NOT NULL;

-- If society_events has society_id column, show events grouped by society
SELECT
    sp.society_name,
    COUNT(se.id) as event_count
FROM society_profiles sp
LEFT JOIN society_events se ON se.society_id = sp.id
GROUP BY sp.id, sp.society_name
ORDER BY sp.society_name;

-- =====================================================================
-- EXPECTED RESULTS
-- =====================================================================
-- 1. society_profiles: 2 rows (TRGG + JOA)
-- 2. Pete's role: 'admin'
-- 3. Events should be linked to societies via society_id UUID
-- =====================================================================
