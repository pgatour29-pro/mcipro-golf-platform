$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
}

$eventId = "9216d987-7ccc-425b-bc86-85406bbe4b80"

Write-Host "=== ALL SCORECARDS FOR TODAY'S EVENT ===" -ForegroundColor Yellow

$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scorecards?event_id=eq.$eventId&select=player_id,player_name,handicap,total_gross,total_stableford,status"
$cards = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

Write-Host "Players in event:"
$cards | ForEach-Object {
    Write-Host "  $($_.player_name) | HCP Used: $($_.handicap) | Gross: $($_.total_gross) | Stab: $($_.total_stableford) | Status: $($_.status)"
}

Write-Host ""
Write-Host "=== ALL ROUNDS FROM TODAY'S EVENT ===" -ForegroundColor Yellow

$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?society_event_id=eq.$eventId&select=golfer_id,course_name,total_gross,total_stableford,played_at"
$rounds = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

$rounds | ForEach-Object {
    Write-Host "  $($_.golfer_id.Substring(0,12))... | Gross: $($_.total_gross) | Stab: $($_.total_stableford) | Played: $($_.played_at)"
}

Write-Host ""
Write-Host "=== CHECK SOCIETY_HANDICAPS FOR ALL EVENT PLAYERS ===" -ForegroundColor Yellow

$cards | ForEach-Object {
    $playerId = $_.player_id
    $playerName = $_.player_name

    $url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_handicaps?golfer_id=eq.$playerId&select=society_id,handicap_index,calculation_method,last_calculated_at&order=last_calculated_at.desc"
    $hcps = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

    Write-Host ""
    Write-Host "$playerName :" -ForegroundColor Cyan
    $hcps | ForEach-Object {
        $societyLabel = if ($_.society_id) { $_.society_id.Substring(0,8) } else { "UNIVERSAL" }
        Write-Host "  $societyLabel | HCP: $($_.handicap_index) | Method: $($_.calculation_method) | Updated: $($_.last_calculated_at)"
    }
}
