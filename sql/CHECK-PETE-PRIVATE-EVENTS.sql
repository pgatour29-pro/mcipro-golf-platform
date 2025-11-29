-- ============================================================================
-- CHECK PETE'S PRIVATE EVENTS (society_events table)
-- ============================================================================

-- 1. Check all events created by Pete
SELECT
    '=== PETE PARK ALL CREATED EVENTS ===' AS section,
    id,
    title,
    event_date,
    course_name,
    is_private,
    creator_type,
    creator_id,
    status,
    created_at
FROM society_events
WHERE creator_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
  AND creator_type = 'golfer'
ORDER BY event_date DESC;

-- 2. Count events by private/public
SELECT
    '=== PETE PARK EVENTS BY TYPE ===' AS section,
    CASE WHEN is_private THEN 'Private' ELSE 'Public' END as event_type,
    COUNT(*) as count
FROM society_events
WHERE creator_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
  AND creator_type = 'golfer'
GROUP BY is_private;

-- 3. Check specifically for Pete's private events
SELECT
    '=== PETE PARK PRIVATE EVENTS ===' AS section,
    id,
    title,
    event_date,
    course_name,
    entry_fee,
    max_participants,
    status,
    created_at
FROM society_events
WHERE creator_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
  AND creator_type = 'golfer'
  AND is_private = true
ORDER BY event_date DESC;

-- 4. Check ALL private events in database
SELECT
    '=== ALL PRIVATE EVENTS ===' AS section,
    id,
    title,
    event_date,
    creator_id,
    creator_type,
    organizer_id,
    created_at
FROM society_events
WHERE is_private = true
ORDER BY created_at DESC
LIMIT 20;

-- 5. Summary stats
SELECT
    '=== SUMMARY ===' AS section,
    COUNT(*) as total_events,
    COUNT(CASE WHEN creator_id = 'U2b6d976f19bca4b2f4374ae0e10ed873' THEN 1 END) as pete_events,
    COUNT(CASE WHEN is_private THEN 1 END) as all_private_events,
    COUNT(CASE WHEN creator_id = 'U2b6d976f19bca4b2f4374ae0e10ed873' AND is_private THEN 1 END) as pete_private_events
FROM society_events;
