$apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
$h = @{
    'apikey' = $apiKey
    'Authorization' = "Bearer $apiKey"
}

# Search scorecards for Tristan
Write-Host "Searching scorecards for Tristan..."
$scUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scorecards?player_name=ilike.*tristan*&select=id,player_id,player_name,total_gross,created_at,event_id&order=created_at.desc"
$scorecards = Invoke-RestMethod -Uri $scUrl -Headers $h

Write-Host "Found $($scorecards.Count) scorecards"

$playerIds = $scorecards | Select-Object -ExpandProperty player_id -Unique
Write-Host "Player IDs: $($playerIds -join ', ')"

foreach ($playerId in $playerIds) {
    $playerSc = $scorecards | Where-Object { $_.player_id -eq $playerId }
    $playerName = ($playerSc | Select-Object -First 1).player_name

    Write-Host ""
    Write-Host "========================================"
    Write-Host "Player: $playerName ($playerId)"
    Write-Host "========================================"

    Write-Host ""
    Write-Host "ALL Scorecards:"
    foreach ($sc in $playerSc) {
        $date = [DateTime]::Parse($sc.created_at).ToString('MMM dd HH:mm')
        $isUuid = $sc.event_id -match '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'

        # Get stableford
        $scoresUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scores?scorecard_id=eq.$($sc.id)&select=stableford_points"
        $scores = Invoke-RestMethod -Uri $scoresUrl -Headers $h
        $totalStableford = ($scores | Measure-Object -Property stableford_points -Sum).Sum

        $courseName = "Unknown"
        if ($isUuid) {
            $eventUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_events?id=eq.$($sc.event_id)&select=course_name"
            $event = Invoke-RestMethod -Uri $eventUrl -Headers $h
            if ($event.course_name) { $courseName = $event.course_name }
        }

        $eventType = if ($isUuid) { "Society" } else { "Other" }
        Write-Host "$date | $courseName | Gross: $($sc.total_gross) | Stableford: $totalStableford | $eventType"
    }

    # Get rounds
    Write-Host ""
    Write-Host "Current Rounds:"
    $roundsUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?golfer_id=eq.$playerId&select=id,course_name,total_gross,total_stableford,played_at&order=played_at.desc"
    $rounds = Invoke-RestMethod -Uri $roundsUrl -Headers $h

    if ($rounds.Count -eq 0) {
        Write-Host "(no rounds in DB)"
    } else {
        foreach ($r in $rounds) {
            $date = [DateTime]::Parse($r.played_at).ToString('MMM dd')
            Write-Host "$date | $($r.course_name) | Gross: $($r.total_gross) | Pts: $($r.total_stableford)"
        }
        $bestStableford = ($rounds | Measure-Object -Property total_stableford -Maximum).Maximum
        Write-Host ""
        Write-Host "Best Stableford in rounds: $bestStableford"
    }
}
