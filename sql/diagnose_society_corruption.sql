-- =====================================================================
-- DIAGNOSTIC SCRIPT FOR SOCIETY CORRUPTION
-- =====================================================================
-- This script is READ-ONLY and will not modify any data.
-- It is intended to gather information about the current corrupted state
-- of the society_profiles and society_events tables.
-- =====================================================================

-- Query 1: List all society profiles to identify duplicates.
-- We are looking for duplicate 'society_name's like 'JOA Golf Pattaya' and 'Ora Ora Golf'.
-- We also want to see all entries for 'Travellers Rest Golf Group'.
-- This will show the different UUIDs (`id`) and `organizer_id`s for each.

SELECT
    id::text AS profile_uuid,
    organizer_id,
    society_name,
    description,
    created_at,
    updated_at
FROM
    public.society_profiles
ORDER BY
    society_name,
    created_at;

-- Query 2: Count events associated with each society profile UUID.
-- This will help us find the 45 orphaned events and see which profile they are
-- currently (and incorrectly) linked to.
-- The MISTAKES_CATALOG suggests they are linked to a profile associated with
-- the user's LINE ID ('U2b6d976f19bca4b2f4374ae0e10ed873').

SELECT
    organizer_id::text AS event_organizer_uuid,
    COUNT(id) AS event_count
FROM
    public.society_events
GROUP BY
    organizer_id
ORDER BY
    event_count DESC;

-- Query 3: Combine the information to get a full picture.
-- This joins profiles and events to see which society name has which events.

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

-- =====================================================================
-- End of Diagnostic Script
-- =====================================================================
