-- =====================================================================
-- DIAGNOSTIC: Check December 17 Royal Lakeside Event Data
-- =====================================================================
-- Run this in Supabase SQL Editor to see what scores exist
-- =====================================================================

-- 1. Find the society event from December 17
SELECT 'Society Events on Dec 17' as query;
SELECT id, title, course, event_date, society_id, organizer_id
FROM society_events
WHERE event_date::date = '2025-12-17'
   OR (course ILIKE '%royal lakeside%' AND event_date >= '2025-12-15')
ORDER BY event_date DESC
LIMIT 10;

-- 2. Check what rounds exist for Royal Lakeside recently
SELECT 'Rounds at Royal Lakeside (Dec 17+)' as query;
SELECT r.id, r.golfer_id, r.player_name, r.course_name,
       r.society_event_id, r.total_gross, r.total_stableford,
       r.handicap_used, r.created_at::date
FROM rounds r
WHERE (r.course_name ILIKE '%royal lakeside%' OR r.course_name ILIKE '%royal%lakeside%')
AND r.created_at >= '2025-12-17'
ORDER BY r.created_at DESC;

-- 3. Check scorecards table for any saved scorecards
SELECT 'Scorecards at Royal Lakeside (Dec 17+)' as query;
SELECT sc.id, sc.player_id, sc.player_name, sc.course_name,
       sc.event_id, sc.total_gross, sc.total_stableford,
       sc.status, sc.created_at::date
FROM scorecards sc
WHERE (sc.course_name ILIKE '%royal lakeside%' OR sc.course_name ILIKE '%royal%lakeside%')
AND sc.created_at >= '2025-12-17'
ORDER BY sc.created_at DESC;

-- 4. Check scores table for hole-by-hole data linked to those scorecards
SELECT 'Scores from Dec 17 scorecards' as query;
SELECT s.scorecard_id, s.hole_number, s.gross_score, s.stableford,
       sc.player_name, sc.player_id
FROM scores s
JOIN scorecards sc ON sc.id = s.scorecard_id
WHERE sc.created_at >= '2025-12-17'
AND (sc.course_name ILIKE '%royal lakeside%' OR sc.course_name ILIKE '%royal%lakeside%')
ORDER BY sc.player_name, s.hole_number;

-- 5. Check who played - look for any mention of the event
SELECT 'Event registrations for Dec 17' as query;
SELECT er.player_id, er.player_name, er.handicap, er.event_id, er.created_at::date
FROM event_registrations er
JOIN society_events se ON se.id = er.event_id
WHERE se.event_date::date = '2025-12-17'
ORDER BY er.player_name;

-- 6. Summary counts
SELECT 'Summary Counts' as query;
SELECT
    (SELECT COUNT(*) FROM rounds WHERE course_name ILIKE '%royal lakeside%' AND created_at >= '2025-12-17') as rounds_count,
    (SELECT COUNT(*) FROM scorecards WHERE course_name ILIKE '%royal lakeside%' AND created_at >= '2025-12-17') as scorecards_count,
    (SELECT COUNT(DISTINCT player_id) FROM scorecards WHERE course_name ILIKE '%royal lakeside%' AND created_at >= '2025-12-17') as unique_players;
