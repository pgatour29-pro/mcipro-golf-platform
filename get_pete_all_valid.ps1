$h = @{
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
}

# Get ALL scorecards with gross >= 60 (real rounds only)
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scorecards?player_id=eq.U2b6d976f19bca4b2f4374ae0e10ed873&select=id,player_name,total_gross,created_at&total_gross=gte.60&order=created_at.desc"
$scorecards = Invoke-RestMethod -Uri $url -Headers $h

Write-Host "Valid scorecards (gross >= 60):"
Write-Host "================================"
foreach ($sc in $scorecards) {
    $date = [DateTime]::Parse($sc.created_at).ToString('yyyy-MM-dd')

    # Get stableford for this scorecard
    $scoresUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scores?scorecard_id=eq.$($sc.id)&select=stableford_points"
    $scores = Invoke-RestMethod -Uri $scoresUrl -Headers $h
    $totalStableford = ($scores | Measure-Object -Property stableford_points -Sum).Sum

    Write-Host "$date | ID: $($sc.id) | Gross: $($sc.total_gross) | Stableford: $totalStableford"
}
