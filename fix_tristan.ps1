$apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
$h = @{
    'apikey' = $apiKey
    'Authorization' = "Bearer $apiKey"
    'Content-Type' = 'application/json'
    'Prefer' = 'return=representation'
}

$tristanId = 'U533f2301ff76d319e0086e8340e4051c'

Write-Host "Adding missing Dec 3 Bangpakong round for Tristan Gilbert..."
Write-Host ""

# First get the actual scorecard to verify the gross score
$scUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scorecards?player_id=eq.$tristanId&event_id=eq.1615e7f3-ef39-4788-9428-fbce5dd2de4a&select=id,total_gross,created_at&order=created_at.desc&limit=1"
$sc = Invoke-RestMethod -Uri $scUrl -Headers $h

if ($sc) {
    # Get hole scores to calculate actual gross
    $scoresUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scores?scorecard_id=eq.$($sc.id)&select=gross_score,stableford_points"
    $scores = Invoke-RestMethod -Uri $scoresUrl -Headers $h

    $totalGross = ($scores | Measure-Object -Property gross_score -Sum).Sum
    $totalStableford = ($scores | Measure-Object -Property stableford_points -Sum).Sum

    Write-Host "Found scorecard: Gross $totalGross, Stableford $totalStableford"

    # Insert the missing round
    $round = @{
        golfer_id = $tristanId
        course_name = 'Bangpakong Riverside Country Club'
        total_gross = $totalGross
        total_stableford = $totalStableford
        type = 'society'
        played_at = '2025-12-03T08:52:00+00:00'
    }

    $insertUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds"
    $body = "[$($round | ConvertTo-Json)]"

    try {
        $result = Invoke-RestMethod -Uri $insertUrl -Method Post -Headers $h -Body $body
        Write-Host "Added Dec 3 Bangpakong round: Gross $totalGross, Stableford $totalStableford"
    } catch {
        Write-Host "Error: $_"
    }
}

# Verify
Write-Host ""
Write-Host "Tristan Gilbert - Updated rounds:"
Write-Host "=================================="
$roundsUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?golfer_id=eq.$tristanId&select=course_name,total_gross,total_stableford,played_at&order=played_at.desc"
$rounds = Invoke-RestMethod -Uri $roundsUrl -Headers $h

foreach ($r in $rounds) {
    $date = [DateTime]::Parse($r.played_at).ToString('MMM dd')
    Write-Host "$date | $($r.course_name) | Gross: $($r.total_gross) | Pts: $($r.total_stableford)"
}

Write-Host ""
Write-Host "Total rounds: $($rounds.Count)"
$bestStableford = ($rounds | Measure-Object -Property total_stableford -Maximum).Maximum
Write-Host "Best Stableford: $bestStableford"
