$apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
$h = @{
    'apikey' = $apiKey
    'Authorization' = "Bearer $apiKey"
}

# Search scorecards for Alan
Write-Host "Searching scorecards for Alan..."
$scUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scorecards?player_name=ilike.*alan*&select=id,player_id,player_name,total_gross,created_at&order=created_at.desc&limit=50"
$scorecards = Invoke-RestMethod -Uri $scUrl -Headers $h

Write-Host "Found $($scorecards.Count) scorecards"
$playerIds = $scorecards | Select-Object -ExpandProperty player_id -Unique

Write-Host "Unique player IDs: $($playerIds -join ', ')"

foreach ($playerId in $playerIds) {
    $playerSc = $scorecards | Where-Object { $_.player_id -eq $playerId }
    $playerName = ($playerSc | Select-Object -First 1).player_name

    Write-Host ""
    Write-Host "Player: $playerName ($playerId)"
    Write-Host "Scorecards:"
    foreach ($sc in $playerSc) {
        $date = if ($sc.created_at) { [DateTime]::Parse($sc.created_at).ToString('MMM dd HH:mm') } else { 'N/A' }
        Write-Host "  $date | Gross: $($sc.total_gross) | ID: $($sc.id)"
    }

    # Get rounds for this player
    Write-Host "Rounds:"
    $roundsUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?golfer_id=eq.$playerId&select=id,course_name,total_gross,total_stableford,played_at&order=played_at.desc"
    $rounds = Invoke-RestMethod -Uri $roundsUrl -Headers $h

    if ($rounds.Count -eq 0) {
        Write-Host "  (no rounds)"
    } else {
        foreach ($r in $rounds) {
            $date = if ($r.played_at) { [DateTime]::Parse($r.played_at).ToString('MMM dd HH:mm') } else { 'N/A' }
            Write-Host "  $date | $($r.course_name) | Gross: $($r.total_gross) | Pts: $($r.total_stableford) | ID: $($r.id)"
        }
    }
}
