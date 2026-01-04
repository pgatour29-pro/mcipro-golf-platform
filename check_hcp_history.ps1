$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
}

$peteLineId = "U2b6d976f19bca4b2f4374ae0e10ed873"

Write-Host "=== PETE'S ROUNDS LAST 3 DAYS ===" -ForegroundColor Yellow

$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?golfer_id=eq.$peteLineId&played_at=gte.2025-12-26&select=id,course_name,total_gross,total_stableford,played_at,society_event_id&order=played_at.desc"
$rounds = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

$rounds | ForEach-Object {
    $society = if ($_.society_event_id) { "SOCIETY" } else { "CASUAL" }
    Write-Host "$($_.played_at) | $society | $($_.course_name) | Gross: $($_.total_gross) | Stab: $($_.total_stableford)"
}

Write-Host ""
Write-Host "=== CHECKING profile_data.golfInfo.lastRoundDifferential ===" -ForegroundColor Yellow

$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?line_user_id=eq.$peteLineId&select=profile_data"
$profile = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

if ($profile.profile_data.golfInfo) {
    Write-Host "handicap: $($profile.profile_data.golfInfo.handicap)"
    Write-Host "lastHandicapUpdate: $($profile.profile_data.golfInfo.lastHandicapUpdate)"
    Write-Host "lastRoundDifferential: $($profile.profile_data.golfInfo.lastRoundDifferential)"
}

Write-Host ""
Write-Host "=== TODAY'S SCORECARD DETAILS ===" -ForegroundColor Yellow

$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scorecards?player_id=eq.$peteLineId&created_at=gte.2025-12-29&select=*"
$cards = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

$cards | ForEach-Object {
    Write-Host "ID: $($_.id)"
    Write-Host "Handicap: $($_.handicap)"
    Write-Host "Status: $($_.status)"
    Write-Host "Total Gross: $($_.total_gross)"
    Write-Host "Event ID: $($_.event_id)"
    Write-Host "Created: $($_.created_at)"
    Write-Host "Updated: $($_.updated_at)"
}
