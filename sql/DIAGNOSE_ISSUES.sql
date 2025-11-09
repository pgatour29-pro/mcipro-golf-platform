-- =====================================================
-- DIAGNOSTIC QUERIES FOR BOTH ISSUES
-- =====================================================

-- ISSUE #2: Check if rounds are being saved with society_event_id
-- =====================================================
SELECT
    '=== ROUNDS WITH SOCIETY EVENT ID ===' as info;

SELECT
    id,
    golfer_id,
    course_name,
    society_event_id,
    organizer_id,
    total_gross,
    total_stableford,
    status,
    completed_at
FROM rounds
WHERE society_event_id IS NOT NULL
ORDER BY completed_at DESC
LIMIT 10;

-- Check if any rounds exist at all
SELECT
    '=== TOTAL ROUNDS COUNT ===' as info;

SELECT
    COUNT(*) as total_rounds,
    COUNT(CASE WHEN society_event_id IS NOT NULL THEN 1 END) as rounds_with_event,
    COUNT(CASE WHEN society_event_id IS NULL THEN 1 END) as rounds_without_event
FROM rounds;

-- Check recent society events
SELECT
    '=== RECENT SOCIETY EVENTS ===' as info;

SELECT
    id,
    title,
    organizer_id,
    event_date,
    status
FROM society_events
ORDER BY event_date DESC
LIMIT 5;

-- ISSUE #1: Check if caddies table has data
-- =====================================================
SELECT
    '=== AVAILABLE CADDIES ===' as info;

SELECT
    id,
    caddy_number,
    name,
    home_club_id,
    home_club_name,
    availability_status,
    rating
FROM caddies
WHERE availability_status = 'available'
LIMIT 10;

-- Check total caddies
SELECT
    '=== CADDY COUNTS ===' as info;

SELECT
    COUNT(*) as total_caddies,
    COUNT(CASE WHEN availability_status = 'available' THEN 1 END) as available_caddies
FROM caddies;
