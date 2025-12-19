$apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
$h = @{
    'apikey' = $apiKey
    'Authorization' = "Bearer $apiKey"
}

# Search for Alan Thomas
Write-Host "Searching for Alan Thomas..."
$searchUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?display_name=ilike.*alan*&select=line_user_id,display_name"
$profiles = Invoke-RestMethod -Uri $searchUrl -Headers $h

foreach ($p in $profiles) {
    Write-Host ""
    Write-Host "Found: $($p.display_name) ($($p.line_user_id))"

    # Get rounds for this player
    $roundsUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?golfer_id=eq.$($p.line_user_id)&select=id,course_name,total_gross,total_stableford,played_at&order=played_at.desc"
    $rounds = Invoke-RestMethod -Uri $roundsUrl -Headers $h

    Write-Host "Rounds: $($rounds.Count)"
    foreach ($r in $rounds) {
        $date = if ($r.played_at) { [DateTime]::Parse($r.played_at).ToString('MMM dd HH:mm') } else { 'N/A' }
        Write-Host "  $date | $($r.course_name) | Gross: $($r.total_gross) | Pts: $($r.total_stableford) | ID: $($r.id)"
    }
}

# Also check scorecards for Alan
Write-Host ""
Write-Host "===================="
Write-Host "Checking scorecards for Alan Thomas..."
foreach ($p in $profiles) {
    $scUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scorecards?player_id=eq.$($p.line_user_id)&select=id,player_name,total_gross,created_at,event_id&total_gross=gte.60&order=created_at.desc"
    $scorecards = Invoke-RestMethod -Uri $scUrl -Headers $h

    Write-Host ""
    Write-Host "$($p.display_name) scorecards (gross >= 60):"
    foreach ($sc in $scorecards) {
        $date = if ($sc.created_at) { [DateTime]::Parse($sc.created_at).ToString('MMM dd HH:mm') } else { 'N/A' }
        $isUuid = $sc.event_id -match '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        $eventType = if ($isUuid) { "Society" } else { "Other" }
        Write-Host "  $date | $($sc.player_name) | Gross: $($sc.total_gross) | Event: $eventType | ID: $($sc.id)"
    }
}
