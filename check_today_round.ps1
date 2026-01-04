$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
}

$peteLineId = "U2b6d976f19bca4b2f4374ae0e10ed873"

Write-Host "=== TODAY'S ROUND (Dec 29) ===" -ForegroundColor Yellow

$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?golfer_id=eq.$peteLineId&played_at=gte.2025-12-29&select=*"
$rounds = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

$rounds | ForEach-Object {
    Write-Host "Round ID: $($_.id)"
    Write-Host "Course: $($_.course_name)"
    Write-Host "Gross: $($_.total_gross)"
    Write-Host "Stableford: $($_.total_stableford)"
    Write-Host "Course Rating: $($_.course_rating)"
    Write-Host "Slope Rating: $($_.slope_rating)"
    Write-Host "Notes: $($_.notes)"
    Write-Host "Played At: $($_.played_at)"
    Write-Host "Completed At: $($_.completed_at)"
    Write-Host "Society Event ID: $($_.society_event_id)"
}

Write-Host ""
Write-Host "=== SCORECARDS FOR TODAY ===" -ForegroundColor Yellow

$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scorecards?player_id=eq.$peteLineId&created_at=gte.2025-12-29&select=*"
$cards = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

$cards | ForEach-Object {
    Write-Host ""
    Write-Host "Scorecard ID: $($_.id)"
    Write-Host "Handicap Used: $($_.handicap)"
    Write-Host "Total Gross: $($_.total_gross)"
    Write-Host "Total Stableford: $($_.total_stableford)"
    Write-Host "Created: $($_.created_at)"
}
