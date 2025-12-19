$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Content-Type" = "application/json"
}
$base = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1"

# Pete's scorecard ID
$scorecardId = "3cb1ff65-23a0-4c33-a357-4b844e1ddc34"

Write-Host "=== ALL SCORES FOR PETE'S SCORECARD ===" -ForegroundColor Cyan
$scores = Invoke-RestMethod "$base/scores?select=*&scorecard_id=eq.$scorecardId&order=hole_number.asc" -Headers $headers
$scores | Format-Table hole_number,gross_score,net_score,stableford_points,par -AutoSize

Write-Host "`n=== CHECKING FOR HOLE 1 ===" -ForegroundColor Yellow
$hole1 = $scores | Where-Object { $_.hole_number -eq 1 }
if ($hole1) {
    Write-Host "Hole 1 EXISTS:" -ForegroundColor Green
    $hole1 | Format-List
} else {
    Write-Host "Hole 1 is MISSING!" -ForegroundColor Red
}

Write-Host "`n=== CHECK ROUNDS TABLE FOR TODAY ===" -ForegroundColor Cyan
$today = (Get-Date).ToString("yyyy-MM-dd")
$rounds = Invoke-RestMethod "$base/rounds?select=id,course_name,player_name,started_at,status,total_stableford,society_event_id&started_at=gte.${today}T00:00:00&order=started_at.desc" -Headers $headers
$rounds | Format-Table -AutoSize

Write-Host "`n=== BANGPAKONG EVENT DETAILS ===" -ForegroundColor Cyan
$eventId = "bdf4c783-73f9-477d-958a-5b2aba80b041"
$event = Invoke-RestMethod "$base/society_events?select=*&id=eq.$eventId" -Headers $headers
$event | Format-List
