-- =====================================================================
-- ATOMIC SCRIPT TO FIX SOCIETY DATABASE CORRUPTION
-- =====================================================================
-- WARNING: This script performs DELETE and UPDATE operations.
-- It is designed to be run as a single transaction.
-- Based on the analysis from COMPLETE_MISTAKES_CATALOG_2025-11-27.md
-- =====================================================================

BEGIN;

-- =====================================================================
-- STEP 0: PRE-FLIGHT DIAGNOSTICS (READ-ONLY)
-- Run these queries to see the state BEFORE the fix.
-- =====================================================================

RAISE NOTICE '--- DIAGNOSTICS: BEFORE FIX ---';

RAISE NOTICE 'Query 1: All society profiles (to see duplicates)';
SELECT id::text, organizer_id, society_name, created_at FROM public.society_profiles ORDER BY society_name, created_at;

RAISE NOTICE 'Query 2: Event counts per society profile UUID';
SELECT organizer_id::text, COUNT(id) AS event_count FROM public.society_events GROUP BY organizer_id ORDER BY event_count DESC;

-- =====================================================================
-- STEP 1: DEFINE KEY IDENTIFIERS
-- Defining these as variables to make the script clear.
-- =====================================================================

-- The user's LINE ID that was incorrectly used as an organizer_id
-- This is associated with a profile that has 45 orphaned events.
-- We need to find the UUID of the *profile* that has this organizer_id.
CREATE TEMP TABLE vars AS (
    SELECT
        'U2b6d976f19bca4b2f4374ae0e10ed873'::text AS incorrect_organizer_text_id,
        'trgg-pattaya'::text AS correct_trgg_text_id
);

-- =====================================================================
-- STEP 2: IDENTIFY CORRECT & INCORRECT PROFILE UUIDs
-- Find the UUIDs we need for the rest of the script.
-- =====================================================================

-- Find the UUID of the profile that was incorrectly used.
-- This is the profile that has the user's LINE ID as its organizer_id.
CREATE TEMP TABLE pids AS (
    SELECT id AS incorrect_profile_uuid
    FROM public.society_profiles
    WHERE organizer_id = (SELECT incorrect_organizer_text_id FROM vars)
);

-- Find or create the CORRECT profile for Travellers Rest Golf Group (TRGG)
-- and get its UUID.
INSERT INTO public.society_profiles (organizer_id, society_name, society_logo, description)
VALUES ((SELECT correct_trgg_text_id FROM vars), 'Travellers Rest Golf Group', './societylogos/trgg.jpg', 'Travellers Rest Golf Group - Regular tournaments and social golf events')
ON CONFLICT (organizer_id) DO NOTHING;

-- Store the correct TRGG profile UUID.
ALTER TABLE pids ADD COLUMN correct_trgg_profile_uuid UUID;
UPDATE pids SET correct_trgg_profile_uuid = (
    SELECT id FROM public.society_profiles WHERE organizer_id = (SELECT correct_trgg_text_id FROM vars)
);

RAISE NOTICE 'Identified incorrect profile UUID: %', (SELECT incorrect_profile_uuid FROM pids);
RAISE NOTICE 'Identified correct TRGG profile UUID: %', (SELECT correct_trgg_profile_uuid FROM pids);


-- =====================================================================
-- STEP 3: RE-ASSIGN ORPHANED EVENTS
-- Update the 45 events that point to the incorrect profile UUID and make
-- them point to the correct TRGG profile UUID.
-- =====================================================================

RAISE NOTICE 'Updating events linked to incorrect profile...';

UPDATE public.society_events
SET organizer_id = (SELECT correct_trgg_profile_uuid FROM pids)
WHERE organizer_id = (SELECT incorrect_profile_uuid FROM pids);

RAISE NOTICE 'Updated % events.', (SELECT count(*) FROM society_events WHERE organizer_id = (SELECT correct_trgg_profile_uuid FROM pids));

-- =====================================================================
-- STEP 4: DELETE DUPLICATE SOCIETY PROFILES
-- For 'JOA Golf Pattaya' and 'Ora Ora Golf', we will keep the OLDEST
-- entry and delete any subsequent duplicates.
-- =====================================================================

RAISE NOTICE 'Deleting duplicate society profiles...';

CREATE TEMP TABLE duplicates_to_delete AS (
    WITH ranked_profiles AS (
        SELECT
            id,
            society_name,
            ROW_NUMBER() OVER(PARTITION BY society_name ORDER BY created_at ASC) as rn
        FROM public.society_profiles
        WHERE society_name IN ('JOA Golf Pattaya', 'Ora Ora Golf')
    )
    SELECT id FROM ranked_profiles WHERE rn > 1
);

DELETE FROM public.society_profiles
WHERE id IN (SELECT id FROM duplicates_to_delete);

RAISE NOTICE 'Deleted % duplicate profiles.', (SELECT count(*) FROM duplicates_to_delete);


-- =====================================================================
-- STEP 5: DELETE THE INCORRECTLY USED PROFILE
-- Now that the events have been re-assigned, we can safely delete the
-- profile that was incorrectly created using the user's LINE ID.
-- =====================================================================

RAISE NOTICE 'Deleting the now-orphaned incorrect profile...';

DELETE FROM public.society_profiles
WHERE id = (SELECT incorrect_profile_uuid FROM pids);

RAISE NOTICE 'Deleted incorrect profile.';


-- =====================================================================
-- STEP 6: POST-FLIGHT DIAGNOSTICS (READ-ONLY)
-- Run these queries again to see the state AFTER the fix.
-- =====================================================================

RAISE NOTICE '--- DIAGNOSTICS: AFTER FIX ---';

RAISE NOTICE 'Query 1: All society profiles (duplicates should be gone)';
SELECT id::text, organizer_id, society_name, created_at FROM public.society_profiles ORDER BY society_name, created_at;

RAISE NOTICE 'Query 2: Event counts per society profile UUID (events should be re-assigned)';
WITH ProfileEventCounts AS (
    SELECT
        organizer_id AS event_organizer_uuid,
        COUNT(id) AS event_count
    FROM
        public.society_events
    GROUP BY
        organizer_id
)
SELECT
    p.id::text AS profile_uuid,
    p.organizer_id AS profile_organizer_text_id,
    p.society_name,
    COALESCE(pec.event_count, 0) AS number_of_events
FROM
    public.society_profiles p
LEFT JOIN
    ProfileEventCounts pec ON p.id = pec.event_organizer_uuid
ORDER BY
    p.society_name,
    number_of_events DESC;


-- If everything looks correct after running this script, you can
-- manually commit the transaction. If anything looks wrong, ROLLBACK.
-- COMMIT;

-- To be safe, this script was originally rolled back unless explicitly committed.
-- The script is now set to COMMIT. Run this script to apply the fix permanently.
COMMIT;

RAISE NOTICE '--- SCRIPT COMPLETE ---';
RAISE NOTICE 'CHANGES HAVE BEEN COMMITTED. The database corruption should now be fixed.';

-- =====================================================================
-- END OF SCRIPT
-- =====================================================================
