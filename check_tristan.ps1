$apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
$h = @{
    'apikey' = $apiKey
    'Authorization' = "Bearer $apiKey"
}

# Find Tristan Gilbert
Write-Host "Searching for Tristan Gilbert..."
$searchUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?display_name=ilike.*tristan*&select=line_user_id,display_name"
$profiles = Invoke-RestMethod -Uri $searchUrl -Headers $h

foreach ($p in $profiles) {
    Write-Host ""
    Write-Host "Found: $($p.display_name) ($($p.line_user_id))"
    $tristanId = $p.line_user_id

    # Get ALL scorecards with stableford calculated
    Write-Host ""
    Write-Host "ALL Scorecards (gross >= 60):"
    Write-Host "=============================="
    $scUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scorecards?player_id=eq.$tristanId&select=id,player_name,total_gross,created_at,event_id&total_gross=gte.60&order=created_at.desc"
    $scorecards = Invoke-RestMethod -Uri $scUrl -Headers $h

    foreach ($sc in $scorecards) {
        $date = [DateTime]::Parse($sc.created_at).ToString('MMM dd HH:mm')
        $isUuid = $sc.event_id -match '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'

        # Get stableford from scores
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

    # Get current rounds
    Write-Host ""
    Write-Host "Current Rounds in DB:"
    Write-Host "====================="
    $roundsUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?golfer_id=eq.$tristanId&select=id,course_name,total_gross,total_stableford,played_at&order=played_at.desc"
    $rounds = Invoke-RestMethod -Uri $roundsUrl -Headers $h

    if ($rounds.Count -eq 0) {
        Write-Host "(no rounds)"
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
