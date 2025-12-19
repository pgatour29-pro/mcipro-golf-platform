$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Content-Type" = "application/json"
}
$base = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1"

Write-Host "=== BANGPAKONG EVENT ===" -ForegroundColor Cyan
$eventId = "bdf4c783-73f9-477d-958a-5b2aba80b041"
$event = Invoke-RestMethod "$base/society_events?select=id,title,event_date,course_name,format,status,is_private&id=eq.$eventId" -Headers $headers
$event | Format-List

Write-Host "`n=== SCORECARDS WITH EVENT_ID ===" -ForegroundColor Cyan
$scorecards = Invoke-RestMethod "$base/scorecards?select=id,player_name,event_id,status&event_id=eq.$eventId" -Headers $headers
$scorecards | Format-Table -AutoSize

Write-Host "`n=== ALL TODAY'S EVENTS ===" -ForegroundColor Cyan
$today = (Get-Date).ToString("yyyy-MM-dd")
$events = Invoke-RestMethod "$base/society_events?select=id,title,event_date,status,is_private&event_date=eq.$today" -Headers $headers
$events | Format-Table -AutoSize

Write-Host "`n=== SCORES COUNT FOR BANGPAKONG ===" -ForegroundColor Cyan
$scorecardIds = ($scorecards | ForEach-Object { "'$($_.id)'" }) -join ","
if ($scorecardIds) {
    $scores = Invoke-RestMethod "$base/scores?select=scorecard_id&scorecard_id=in.($scorecardIds)" -Headers $headers
    Write-Host "Total scores: $($scores.Count)"
}
