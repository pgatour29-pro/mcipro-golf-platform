-- =====================================================
-- FIX BUDAPAW EVENT FEES
-- =====================================================
-- This script fixes the "10-24-25 Budapaw Two-Man Scramble" event
-- by setting the member_fee and updating all registrations

-- Step 1: Find the event and set member_fee
-- (Update the event_id in the WHERE clause to match your event)

-- First, let's find the event ID:
SELECT id, name, date, base_fee, member_fee, non_member_fee
FROM society_events
WHERE name LIKE '%Budapaw%'
ORDER BY date DESC
LIMIT 5;

-- Step 2: Update the event to set member_fee (if base_fee exists)
UPDATE society_events
SET member_fee = COALESCE(base_fee, 2250),
    non_member_fee = 0  -- Set to 1000 if you want non-members to pay extra
WHERE name LIKE '%Budapaw%'
  AND date >= '2025-10-24'
  AND (member_fee IS NULL OR member_fee = 0);

-- Step 3: Verify the event was updated
SELECT id, name, date, base_fee, member_fee, non_member_fee
FROM society_events
WHERE name LIKE '%Budapaw%'
ORDER BY date DESC
LIMIT 1;

-- Step 4: View current registrations with zero fees
SELECT r.id, r.player_name, r.player_id, r.total_fee, r.want_transport, r.want_competition,
       e.name as event_name, e.member_fee, e.non_member_fee
FROM event_registrations r
JOIN society_events e ON r.event_id = e.id
WHERE e.name LIKE '%Budapaw%'
  AND e.date >= '2025-10-24'
ORDER BY r.player_name;

-- Step 5: Check which players are society members
SELECT r.player_name, r.player_id,
       CASE
           WHEN sm.id IS NOT NULL THEN 'MEMBER'
           ELSE 'NON-MEMBER'
       END as membership_status,
       sm.member_number
FROM event_registrations r
JOIN society_events e ON r.event_id = e.id
LEFT JOIN society_members sm ON sm.golfer_id = r.player_id
    AND sm.society_name = e.organizer_name
    AND sm.status = 'active'
WHERE e.name LIKE '%Budapaw%'
  AND e.date >= '2025-10-24'
ORDER BY r.player_name;

-- Step 6: Manually update fees for each player based on membership
-- (Run this AFTER confirming member_fee is set correctly)

-- If you know the event_id, you can update all registrations at once:
-- UPDATE event_registrations
-- SET total_fee = (
--     SELECT CASE
--         WHEN sm.id IS NOT NULL THEN e.member_fee
--         ELSE e.member_fee + COALESCE(e.non_member_fee, 0)
--     END
--     FROM society_events e
--     LEFT JOIN society_members sm ON sm.golfer_id = event_registrations.player_id
--         AND sm.society_name = e.organizer_name
--         AND sm.status = 'active'
--     WHERE e.id = event_registrations.event_id
-- )
-- WHERE event_id = 'PASTE_EVENT_ID_HERE'
--   AND (total_fee IS NULL OR total_fee = 0);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Run the SELECT queries above to find your event';
    RAISE NOTICE '✅ Then use the browser console recalculation utility';
    RAISE NOTICE 'Example: await SocietyGolfDB.recalculateEventFees("your-event-id")';
END $$;
