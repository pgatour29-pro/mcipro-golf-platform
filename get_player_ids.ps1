$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Content-Type" = "application/json"
}
$base = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1"
$eventId = "bdf4c783-73f9-477d-958a-5b2aba80b041"

Write-Host "=== GETTING PLAYER INFO FOR ROUNDS ===" -ForegroundColor Cyan

# Get scorecards with all needed data
$scorecards = Invoke-RestMethod "$base/scorecards?select=id,player_id,player_name,handicap,total_gross,status&event_id=eq.$eventId" -Headers $headers

foreach ($sc in $scorecards) {
    Write-Host "`n$($sc.player_name):" -ForegroundColor Yellow
    Write-Host "  Scorecard ID: $($sc.id)"
    Write-Host "  Player ID: $($sc.player_id)"
    Write-Host "  Handicap: $($sc.handicap)"
    Write-Host "  Total Gross: $($sc.total_gross)"

    # Get stableford total
    $scores = Invoke-RestMethod "$base/scores?select=stableford_points&scorecard_id=eq.$($sc.id)" -Headers $headers
    $totalStableford = ($scores | Measure-Object -Property stableford_points -Sum).Sum
    Write-Host "  Total Stableford: $totalStableford"
}

# Get event info
Write-Host "`n=== EVENT INFO ===" -ForegroundColor Cyan
$event = Invoke-RestMethod "$base/society_events?select=id,title,course_name,organizer_id&id=eq.$eventId" -Headers $headers
$event | Format-List
