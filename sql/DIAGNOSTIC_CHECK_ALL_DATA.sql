-- ====================================================================
-- COMPREHENSIVE DATA DIAGNOSTIC - Check ALL Data in Supabase
-- Run this in Supabase SQL Editor to see current state
-- ====================================================================

-- 1. CHECK USER PROFILES
SELECT
    '=== USER PROFILES ===' AS section,
    COUNT(*) AS total_profiles,
    COUNT(CASE WHEN name IS NOT NULL AND name != '' THEN 1 END) AS profiles_with_names,
    COUNT(CASE WHEN home_course_name IS NOT NULL AND home_course_name != '' THEN 1 END) AS profiles_with_home_course,
    COUNT(CASE WHEN society_name IS NOT NULL AND society_name != '' THEN 1 END) AS profiles_with_society,
    COUNT(CASE WHEN profile_data IS NOT NULL THEN 1 END) AS profiles_with_data
FROM user_profiles;

-- Show all user profiles
SELECT
    line_user_id,
    name,
    email,
    role,
    home_course_name,
    home_course_id,
    society_name,
    society_id,
    created_at,
    updated_at
FROM user_profiles
ORDER BY name;

-- Check specific users (Pete and others)
SELECT
    '=== PETE PARK DATA ===' AS section,
    *
FROM user_profiles
WHERE name ILIKE '%pete%' OR name ILIKE '%park%';

-- 2. CHECK SOCIETY PROFILES
SELECT
    '=== SOCIETY PROFILES ===' AS section,
    COUNT(*) AS total_societies
FROM society_profiles;

SELECT
    organizer_id,
    society_name,
    organizer_name,
    description,
    location,
    created_at
FROM society_profiles
ORDER BY society_name;

-- 3. CHECK SOCIETY MEMBERS
SELECT
    '=== SOCIETY MEMBERS ===' AS section,
    COUNT(*) AS total_memberships,
    COUNT(DISTINCT society_name) AS unique_societies,
    COUNT(DISTINCT golfer_id) AS unique_golfers
FROM society_members;

SELECT
    society_name,
    golfer_id,
    member_number,
    is_primary_society,
    status,
    joined_at
FROM society_members
ORDER BY society_name, golfer_id;

-- 4. CHECK SOCIETY EVENTS
SELECT
    '=== SOCIETY EVENTS ===' AS section,
    COUNT(*) AS total_events,
    COUNT(CASE WHEN event_date >= CURRENT_DATE THEN 1 END) AS upcoming_events,
    COUNT(CASE WHEN event_date < CURRENT_DATE THEN 1 END) AS past_events
FROM society_events;

SELECT
    event_id,
    organizer_id,
    event_name,
    event_date,
    course_name,
    max_participants,
    registration_status,
    created_at
FROM society_events
ORDER BY event_date DESC
LIMIT 20;

-- 5. CHECK EVENT REGISTRATIONS
SELECT
    '=== EVENT REGISTRATIONS ===' AS section,
    COUNT(*) AS total_registrations,
    COUNT(DISTINCT event_id) AS events_with_registrations,
    COUNT(DISTINCT golfer_id) AS unique_registered_golfers
FROM society_event_registrations;

-- 6. CHECK ROUND HISTORY
SELECT
    '=== ROUND HISTORY ===' AS section,
    COUNT(*) AS total_rounds,
    COUNT(CASE WHEN played_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) AS rounds_last_30_days,
    COUNT(DISTINCT line_user_id) AS unique_golfers_with_rounds
FROM round_history;

SELECT
    line_user_id,
    course_name,
    gross_score,
    net_score,
    played_at,
    created_at
FROM round_history
ORDER BY played_at DESC
LIMIT 20;

-- 7. CHECK SCORECARDS
SELECT
    '=== SCORECARDS ===' AS section,
    COUNT(*) AS total_scorecards,
    COUNT(DISTINCT line_user_id) AS golfers_with_scorecards
FROM scorecards;

-- 8. CHECK BOOKINGS
SELECT
    '=== BOOKINGS ===' AS section,
    COUNT(*) AS total_bookings,
    COUNT(CASE WHEN date >= CURRENT_DATE THEN 1 END) AS future_bookings,
    COUNT(CASE WHEN date < CURRENT_DATE THEN 1 END) AS past_bookings
FROM bookings;

SELECT
    id,
    name,
    date,
    time,
    course_name,
    status,
    created_at
FROM bookings
ORDER BY date DESC
LIMIT 20;

-- 9. CHECK CADDY SYSTEM
SELECT
    '=== CADDIES ===' AS section,
    COUNT(*) AS total_caddies,
    COUNT(DISTINCT course_id) AS courses_with_caddies
FROM caddies;

SELECT
    caddy_id,
    course_id,
    name,
    rating,
    language_skills,
    status
FROM caddies
LIMIT 20;

-- 10. DATA COMPLETENESS REPORT
SELECT
    'COMPLETENESS REPORT' AS report,
    (SELECT COUNT(*) FROM user_profiles) AS user_profiles_count,
    (SELECT COUNT(*) FROM society_profiles) AS society_profiles_count,
    (SELECT COUNT(*) FROM society_members) AS society_members_count,
    (SELECT COUNT(*) FROM society_events) AS society_events_count,
    (SELECT COUNT(*) FROM society_event_registrations) AS event_registrations_count,
    (SELECT COUNT(*) FROM round_history) AS round_history_count,
    (SELECT COUNT(*) FROM scorecards) AS scorecards_count,
    (SELECT COUNT(*) FROM bookings) AS bookings_count,
    (SELECT COUNT(*) FROM caddies) AS caddies_count;

-- 11. CHECK FOR MISSING DATA (NULL VALUES)
SELECT
    '=== MISSING DATA IN USER PROFILES ===' AS section,
    COUNT(CASE WHEN name IS NULL OR name = '' THEN 1 END) AS missing_names,
    COUNT(CASE WHEN email IS NULL OR email = '' THEN 1 END) AS missing_emails,
    COUNT(CASE WHEN home_course_name IS NULL OR home_course_name = '' THEN 1 END) AS missing_home_course,
    COUNT(CASE WHEN society_name IS NULL OR society_name = '' THEN 1 END) AS missing_society,
    COUNT(CASE WHEN profile_data IS NULL THEN 1 END) AS missing_profile_data
FROM user_profiles;

-- Show users with incomplete profiles
SELECT
    line_user_id,
    name,
    CASE WHEN name IS NULL OR name = '' THEN 'NO NAME' ELSE 'OK' END AS name_status,
    CASE WHEN home_course_name IS NULL OR home_course_name = '' THEN 'NO HOME COURSE' ELSE 'OK' END AS home_course_status,
    CASE WHEN society_name IS NULL OR society_name = '' THEN 'NO SOCIETY' ELSE 'OK' END AS society_status,
    CASE WHEN profile_data IS NULL THEN 'NO DATA' ELSE 'OK' END AS profile_data_status
FROM user_profiles
WHERE
    name IS NULL OR name = '' OR
    home_course_name IS NULL OR home_course_name = '' OR
    society_name IS NULL OR society_name = '' OR
    profile_data IS NULL
ORDER BY name;

-- 12. FINAL SUMMARY
SELECT
    '=== DATA LOSS SUMMARY ===' AS summary,
    CASE
        WHEN (SELECT COUNT(*) FROM user_profiles WHERE name IS NOT NULL AND name != '') = 0 THEN '🔴 CRITICAL: All user names lost'
        WHEN (SELECT COUNT(*) FROM user_profiles WHERE name IS NOT NULL AND name != '') < 5 THEN '🟠 WARNING: Most user data lost'
        ELSE '🟢 OK: User data exists'
    END AS user_data_status,
    CASE
        WHEN (SELECT COUNT(*) FROM society_profiles) = 0 THEN '🔴 CRITICAL: All societies lost'
        WHEN (SELECT COUNT(*) FROM society_profiles) < 3 THEN '🟠 WARNING: Some societies lost'
        ELSE '🟢 OK: Society data exists'
    END AS society_data_status,
    CASE
        WHEN (SELECT COUNT(*) FROM round_history) = 0 THEN '🔴 CRITICAL: All round history lost'
        ELSE '🟢 OK: Round history exists'
    END AS round_history_status;
