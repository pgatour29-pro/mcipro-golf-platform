$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Content-Type" = "application/json"
}
$base = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1"
$today = (Get-Date).ToString("yyyy-MM-dd")

Write-Host "=== TODAY'S ROUNDS ($today) ===" -ForegroundColor Cyan
$rounds = Invoke-RestMethod "$base/rounds?select=id,course_name,player_name,started_at,status,total_stableford,current_hole,society_event_id&started_at=gte.${today}T00:00:00&order=started_at.desc" -Headers $headers
$rounds | Format-Table id,course_name,player_name,status,total_stableford,current_hole -AutoSize

Write-Host "`n=== TODAY'S SCORECARDS ===" -ForegroundColor Cyan
$scorecards = Invoke-RestMethod "$base/scorecards?select=id,player_id,event_id,total_gross,status,created_at&created_at=gte.${today}T00:00:00&order=created_at.desc" -Headers $headers
$scorecards | Format-Table -AutoSize

Write-Host "`n=== TODAY'S SOCIETY EVENTS ===" -ForegroundColor Cyan
$events = Invoke-RestMethod "$base/society_events?select=id,title,event_date,course_name,format&event_date=eq.$today" -Headers $headers
$events | Format-Table -AutoSize

# If we found scorecards, check their scores
if ($scorecards.Count -gt 0) {
    Write-Host "`n=== SCORES FOR FIRST SCORECARD ===" -ForegroundColor Cyan
    $firstId = $scorecards[0].id
    $scores = Invoke-RestMethod "$base/scores?select=hole_number,gross_score,stableford_points&scorecard_id=eq.$firstId&order=hole_number.asc" -Headers $headers
    $scores | Format-Table -AutoSize
}
