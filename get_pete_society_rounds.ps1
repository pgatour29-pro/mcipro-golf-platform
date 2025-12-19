$h = @{
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
}

# Get scorecards with event_id that looks like a UUID (real society events)
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scorecards?player_id=eq.U2b6d976f19bca4b2f4374ae0e10ed873&select=id,player_name,total_gross,created_at,event_id&total_gross=gte.60&order=created_at.desc"
$scorecards = Invoke-RestMethod -Uri $url -Headers $h

Write-Host "Scorecards with UUID event_id (real society events):"
Write-Host "======================================================="
foreach ($sc in $scorecards) {
    # Check if event_id looks like a UUID
    if ($sc.event_id -match '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') {
        $date = [DateTime]::Parse($sc.created_at).ToString('yyyy-MM-dd')

        # Get stableford for this scorecard
        $scoresUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scores?scorecard_id=eq.$($sc.id)&select=stableford_points"
        $scores = Invoke-RestMethod -Uri $scoresUrl -Headers $h
        $totalStableford = ($scores | Measure-Object -Property stableford_points -Sum).Sum

        Write-Host "$date | Event: $($sc.event_id) | Gross: $($sc.total_gross) | Stableford: $totalStableford"
    }
}
