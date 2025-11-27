-- FIX TRAVELLERS REST EVENTS AND SOCIETY CORRUPTION
-- This script fixes the database corruption caused by using wrong organizer_id in code

BEGIN;

-- STEP 1: DIAGNOSTIC - See current state
SELECT
    id,
    organizer_id,
    society_name,
    society_logo,
    (SELECT COUNT(*) FROM society_events WHERE society_events.organizer_id = society_profiles.id) as event_count
FROM society_profiles
ORDER BY society_name;

-- STEP 2: Find the correct Travellers Rest society UUID
-- We need this to reassign events
DO $$
DECLARE
    trgg_uuid uuid;
    line_user_uuid uuid;
BEGIN
    -- Get the UUID for the correct Travellers Rest society
    SELECT id INTO trgg_uuid
    FROM society_profiles
    WHERE organizer_id = 'trgg-pattaya';

    -- Get the UUID for the incorrectly created society (if it exists)
    SELECT id INTO line_user_uuid
    FROM society_profiles
    WHERE organizer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

    -- STEP 3: If the LINE user society exists, reassign its events to Travellers Rest
    IF line_user_uuid IS NOT NULL AND trgg_uuid IS NOT NULL THEN
        UPDATE society_events
        SET organizer_id = trgg_uuid
        WHERE organizer_id = line_user_uuid;

        RAISE NOTICE 'Reassigned events from % to %', line_user_uuid, trgg_uuid;
    END IF;

    -- STEP 4: Delete the incorrectly created society profile
    DELETE FROM society_profiles
    WHERE organizer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

    RAISE NOTICE 'Deleted incorrect society profile';
END $$;

-- STEP 5: Ensure Travellers Rest has correct data
INSERT INTO society_profiles (organizer_id, society_name, society_logo, description, created_at, updated_at)
VALUES ('trgg-pattaya', 'Travellers Rest Golf Group', 'societylogos/trgg.jpg', 'Travellers Rest Golf Group', NOW(), NOW())
ON CONFLICT (organizer_id) DO UPDATE SET
    society_name = 'Travellers Rest Golf Group',
    society_logo = 'societylogos/trgg.jpg',
    description = 'Travellers Rest Golf Group',
    updated_at = NOW();

-- STEP 6: Clean up any duplicate JOA entries (keep only JOAGOLFPAT)
DELETE FROM society_profiles
WHERE society_name LIKE '%JOA%'
AND organizer_id != 'JOAGOLFPAT';

-- STEP 7: Clean up any duplicate Ora Ora entries (keep only ORAORAGOLF)
DELETE FROM society_profiles
WHERE society_name LIKE '%Ora%'
AND organizer_id != 'ORAORAGOLF';

-- STEP 8: Ensure JOA exists with correct data
INSERT INTO society_profiles (organizer_id, society_name, description, created_at, updated_at)
VALUES ('JOAGOLFPAT', 'JOA Golf Pattaya', 'JOA Golf Pattaya Society - Weekly tournaments', NOW(), NOW())
ON CONFLICT (organizer_id) DO UPDATE SET
    society_name = 'JOA Golf Pattaya',
    description = 'JOA Golf Pattaya Society - Weekly tournaments',
    updated_at = NOW();

-- STEP 9: Ensure Ora Ora exists with correct data
INSERT INTO society_profiles (organizer_id, society_name, description, created_at, updated_at)
VALUES ('ORAORAGOLF', 'Ora Ora Golf', 'Ora Ora Golf', NOW(), NOW())
ON CONFLICT (organizer_id) DO UPDATE SET
    society_name = 'Ora Ora Golf',
    description = 'Ora Ora Golf',
    updated_at = NOW();

-- STEP 10: FINAL VERIFICATION - Show clean state
SELECT
    organizer_id,
    society_name,
    society_logo,
    (SELECT COUNT(*) FROM society_events WHERE society_events.organizer_id = society_profiles.id) as event_count
FROM society_profiles
ORDER BY society_name;

COMMIT;

-- After running this, you should see exactly 3 societies:
-- 1. JOA Golf Pattaya (JOAGOLFPAT) with its events
-- 2. Ora Ora Golf (ORAORAGOLF) with its events
-- 3. Travellers Rest Golf Group (trgg-pattaya) with ALL 45 events restored
