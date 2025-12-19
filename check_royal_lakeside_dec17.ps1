# Check what rounds exist for yesterday's Royal Lakeside event
$env:SUPABASE_URL = "https://hkzxkdqjohpypqzmbfqh.supabase.co"

# Get the event ID for yesterday's Travellers Rest at Royal Lakeside
Write-Host "=== Checking Society Events ===" -ForegroundColor Cyan
$query = @"
SELECT id, title, course, event_date, society_id
FROM society_events 
WHERE event_date >= '2025-12-17' AND event_date < '2025-12-18'
OR course ILIKE '%royal lakeside%'
ORDER BY event_date DESC
LIMIT 5;
"@
Write-Host $query

Write-Host "`n=== Checking Rounds for Royal Lakeside ===" -ForegroundColor Cyan
$query2 = @"
SELECT r.id, r.golfer_id, r.player_name, r.course_name, r.society_event_id, 
       r.total_gross, r.total_stableford, r.created_at::date
FROM rounds r
WHERE r.course_name ILIKE '%royal lakeside%'
AND r.created_at >= '2025-12-17'
ORDER BY r.created_at DESC;
"@
Write-Host $query2

Write-Host "`n=== Checking Scorecards ===" -ForegroundColor Cyan
$query3 = @"
SELECT sc.id, sc.player_id, sc.player_name, sc.course_name, sc.event_id,
       sc.total_gross, sc.total_stableford, sc.created_at::date
FROM scorecards sc
WHERE sc.course_name ILIKE '%royal lakeside%'
AND sc.created_at >= '2025-12-17'
ORDER BY sc.created_at DESC;
"@
Write-Host $query3
