$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
}

$eventId = "33e609fc-a418-4e93-b539-ff85f2919cc3"
$scUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scorecards?event_id=eq.$eventId&select=id,player_id,created_at"
$scorecards = Invoke-RestMethod -Uri $scUrl -Headers $headers -Method Get

Write-Host "=== REMAINING SCORECARDS ===" -ForegroundColor Cyan
$scorecards | Format-Table -AutoSize
Write-Host "Total: $($scorecards.Count) scorecards (should be 5 unique players)" -ForegroundColor Green
