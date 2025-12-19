$apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
$h = @{
    'apikey' = $apiKey
    'Authorization' = "Bearer $apiKey"
}

# Check the BRC event
$eventUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_events?id=eq.1615e7f3-ef39-4788-9428-fbce5dd2de4a&select=*"
$event = Invoke-RestMethod -Uri $eventUrl -Headers $h
Write-Host "BRC Event Details:"
Write-Host "=================="
$event | ConvertTo-Json

# Also check what Alan has for Dec 3
Write-Host ""
Write-Host "Alan's Dec 3 scorecard with actual scores:"
$alanId = 'U214f2fe47e1681fbb26f0aba95930d64'
$scUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scorecards?player_id=eq.$alanId&event_id=eq.1615e7f3-ef39-4788-9428-fbce5dd2de4a&select=id,total_gross,created_at&order=created_at.desc&limit=1"
$sc = Invoke-RestMethod -Uri $scUrl -Headers $h

if ($sc) {
    $scoresUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scores?scorecard_id=eq.$($sc.id)&select=hole_number,gross_score,stableford_points&order=hole_number"
    $scores = Invoke-RestMethod -Uri $scoresUrl -Headers $h

    Write-Host "Scorecard ID: $($sc.id)"
    Write-Host "Total Gross: $($sc.total_gross)"
    Write-Host "Created: $($sc.created_at)"
    Write-Host ""
    Write-Host "Hole scores:"

    $totalGross = 0
    $totalPts = 0
    foreach ($s in $scores) {
        Write-Host "  Hole $($s.hole_number): Gross $($s.gross_score), Pts $($s.stableford_points)"
        $totalGross += $s.gross_score
        $totalPts += $s.stableford_points
    }
    Write-Host ""
    Write-Host "Calculated totals: Gross $totalGross, Stableford $totalPts"
}
