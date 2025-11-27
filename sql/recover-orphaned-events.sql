-- RECOVER ORPHANED EVENTS
-- Based on screenshot showing 3 existing societies with their UUIDs

-- The 3 valid society UUIDs from the database:
-- JOA Golf Pattaya: 72d8444a-56bf-4441-86f2-22087f0e6b27
-- Ora Ora Golf: 64aa0745-9e05-4f9f-9f22-373c9b29cf2d
-- Travellers Rest Golf Group: 7c0e4b72-d925-44bc-afda-38259a7ba346

BEGIN;

-- STEP 1: Show total events in database
SELECT COUNT(*) as total_events FROM society_events;

-- STEP 2: Show orphaned events (events pointing to deleted societies)
SELECT
    se.id,
    se.title,
    se.event_date,
    se.organizer_id as orphaned_uuid,
    'ORPHANED - needs reassignment' as status
FROM society_events se
LEFT JOIN society_profiles sp ON se.organizer_id = sp.id
WHERE sp.id IS NULL;

-- STEP 3: Reassign ALL orphaned events to Travellers Rest
-- (Since the bug created events with user's LINE ID, they were likely Travellers Rest events)
UPDATE society_events
SET organizer_id = '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid
WHERE organizer_id NOT IN (
    '72d8444a-56bf-4441-86f2-22087f0e6b27'::uuid,  -- JOA Golf Pattaya
    '64aa0745-9e05-4f9f-9f22-373c9b29cf2d'::uuid,  -- Ora Ora Golf
    '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid   -- Travellers Rest Golf Group
);

-- STEP 4: Verify the fix - show event count per society
SELECT
    sp.organizer_id,
    sp.society_name,
    COUNT(se.id) as event_count
FROM society_profiles sp
LEFT JOIN society_events se ON se.organizer_id = sp.id
GROUP BY sp.id, sp.organizer_id, sp.society_name
ORDER BY sp.society_name;

COMMIT;
