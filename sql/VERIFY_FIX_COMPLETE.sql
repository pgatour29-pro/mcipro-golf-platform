-- =====================================================================
-- VERIFY ALL FIXES ARE COMPLETE
-- =====================================================================
-- Run this to confirm everything is working correctly
-- =====================================================================

-- 1. Society Profiles - Should only have 3 (no duplicates)
SELECT
    '=== FINAL: All Society Profiles (should be 3) ===' AS section,
    id::text AS profile_uuid,
    organizer_id,
    society_name,
    created_at
FROM public.society_profiles
ORDER BY society_name;

-- 2. Event counts per society - TRGG should have ~45 events
SELECT
    '=== FINAL: Event Counts by Society ===' AS section,
    p.society_name,
    COUNT(e.id) AS event_count
FROM public.society_profiles p
LEFT JOIN public.society_events e ON e.society_id = p.id
GROUP BY p.society_name
ORDER BY p.society_name;

-- 3. Check for orphaned events (should be 0)
SELECT
    '=== FINAL: Orphaned Events (should be 0) ===' AS section,
    COUNT(*) AS orphaned_count
FROM public.society_events
WHERE society_id IS NULL OR society_id NOT IN (SELECT id FROM public.society_profiles);

-- 4. Notifications table structure check
SELECT
    '=== FINAL: Notifications Table Columns ===' AS section,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- 5. User profiles - check new columns exist
SELECT
    '=== FINAL: User Profiles New Columns ===' AS section,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'user_profiles'
  AND column_name IN ('subscription_tier', 'user_status')
ORDER BY column_name;

-- 6. Performance logs table check
SELECT
    '=== FINAL: Performance Logs Table Check ===' AS section,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'performance_logs')
        THEN 'EXISTS ✓'
        ELSE 'MISSING ✗'
    END AS table_status;

-- 7. Sample TRGG events to confirm they're linked correctly
SELECT
    '=== FINAL: Sample TRGG Events (should show society_id) ===' AS section,
    e.id::text AS event_id,
    e.title,
    e.date,
    e.society_id::text AS linked_to_society_uuid,
    p.society_name AS society_name
FROM public.society_events e
LEFT JOIN public.society_profiles p ON p.id = e.society_id
WHERE e.title ILIKE '%TRGG%'
ORDER BY e.date DESC
LIMIT 5;

-- Summary
SELECT
    '=== SUMMARY ===' AS section,
    (SELECT COUNT(*) FROM public.society_profiles) AS total_societies,
    (SELECT COUNT(*) FROM public.society_events WHERE title ILIKE '%TRGG%') AS trgg_events,
    (SELECT COUNT(*) FROM public.society_events WHERE society_id IS NULL) AS orphaned_events,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'is_read')
        THEN 'YES ✓'
        ELSE 'NO ✗'
    END AS notifications_fixed,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'subscription_tier')
        THEN 'YES ✓'
        ELSE 'NO ✗'
    END AS user_features_added;
