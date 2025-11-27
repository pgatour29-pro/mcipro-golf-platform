-- COMPREHENSIVE FIX FOR SOCIETY DUPLICATES
-- This script handles all possible corruption scenarios

BEGIN;

-- Step 1: Fix Travellers Rest if it was renamed to JOA
UPDATE society_profiles
SET society_name = 'Travellers Rest Golf Group',
    society_logo = 'societylogos/trgg.jpg',
    description = 'Travellers Rest Golf Group'
WHERE organizer_id = 'trgg-pattaya';

-- Step 2: Delete any entry I created with your LINE user ID
DELETE FROM society_profiles
WHERE organizer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- Step 3: Delete duplicate JOA entries (keep only JOAGOLFPAT)
DELETE FROM society_profiles
WHERE society_name LIKE '%JOA%'
AND organizer_id != 'JOAGOLFPAT';

-- Step 4: Delete duplicate Ora Ora entries (keep only ORAORAGOLF)
DELETE FROM society_profiles
WHERE society_name LIKE '%Ora%'
AND organizer_id != 'ORAORAGOLF';

-- Step 5: Ensure all 3 societies exist with correct data
INSERT INTO society_profiles (organizer_id, society_name, society_logo, description, created_at, updated_at)
VALUES
    ('JOAGOLFPAT', 'JOA Golf Pattaya', NULL, 'JOA Golf Pattaya Society - Weekly tournaments', NOW(), NOW()),
    ('ORAORAGOLF', 'Ora Ora Golf', NULL, 'Ora Ora Golf', NOW(), NOW()),
    ('trgg-pattaya', 'Travellers Rest Golf Group', 'societylogos/trgg.jpg', 'Travellers Rest Golf Group', NOW(), NOW())
ON CONFLICT (organizer_id) DO UPDATE SET
    society_name = EXCLUDED.society_name,
    society_logo = EXCLUDED.society_logo,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Step 6: Verify the fix
SELECT organizer_id, society_name,
       (SELECT COUNT(*) FROM society_events WHERE organizer_id = society_profiles.organizer_id) as event_count
FROM society_profiles
ORDER BY society_name;

COMMIT;
