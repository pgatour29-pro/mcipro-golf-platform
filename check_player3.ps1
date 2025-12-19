$apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
$h = @{
    'apikey' = $apiKey
    'Authorization' = "Bearer $apiKey"
}

$playerId = 'U9e64d5456b0582e81743c87fa48c21e2'

# Get profile
$profileUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?line_user_id=eq.$playerId&select=display_name"
$profile = Invoke-RestMethod -Uri $profileUrl -Headers $h
Write-Host "Player: $($profile.display_name) ($playerId)"

# Get all scorecards
Write-Host ""
Write-Host "ALL Scorecards:"
$scUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scorecards?player_id=eq.$playerId&select=id,player_name,total_gross,created_at,event_id&order=created_at.desc"
$scorecards = Invoke-RestMethod -Uri $scUrl -Headers $h

foreach ($sc in $scorecards) {
    $date = if ($sc.created_at) { [DateTime]::Parse($sc.created_at).ToString('MMM dd HH:mm') } else { 'N/A' }
    $isUuid = $sc.event_id -match '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    $eventType = if ($isUuid) { "Society" } else { "Test/Other" }
    Write-Host "  $date | Gross: $($sc.total_gross) | Event: $eventType | event_id: $($sc.event_id)"
}

# Get all rounds
Write-Host ""
Write-Host "Current Rounds:"
$roundsUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?golfer_id=eq.$playerId&select=id,course_name,total_gross,total_stableford,played_at&order=played_at.desc"
$rounds = Invoke-RestMethod -Uri $roundsUrl -Headers $h

foreach ($r in $rounds) {
    $date = if ($r.played_at) { [DateTime]::Parse($r.played_at).ToString('MMM dd HH:mm') } else { 'N/A' }
    Write-Host "  $date | $($r.course_name) | Gross: $($r.total_gross) | Pts: $($r.total_stableford) | ID: $($r.id)"
}
