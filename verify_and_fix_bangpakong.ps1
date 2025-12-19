$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Content-Type" = "application/json"
}
$base = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1"
$eventId = "bdf4c783-73f9-477d-958a-5b2aba80b041"

Write-Host "=== VERIFY BANGPAKONG EVENT ===" -ForegroundColor Cyan

# 1. Check if event exists
Write-Host "`n1. EVENT DETAILS:" -ForegroundColor Yellow
$event = Invoke-RestMethod "$base/society_events?select=id,title,event_date,course_name,format,status,is_private&id=eq.$eventId" -Headers $headers
$event | Format-List

# 2. Check scorecards
Write-Host "`n2. SCORECARDS:" -ForegroundColor Yellow
$scorecards = Invoke-RestMethod "$base/scorecards?select=id,player_name,handicap,total_gross,status&event_id=eq.$eventId" -Headers $headers
$scorecards | Format-Table -AutoSize

# 3. Check scores for each scorecard
Write-Host "`n3. SCORES PER SCORECARD:" -ForegroundColor Yellow
foreach ($sc in $scorecards) {
    $scores = Invoke-RestMethod "$base/scores?select=hole_number,gross_score,stableford_points&scorecard_id=eq.$($sc.id)&order=hole_number.asc" -Headers $headers
    Write-Host "  $($sc.player_name): $($scores.Count) holes" -ForegroundColor Green
    if ($scores.Count -gt 0) {
        $holes = ($scores | ForEach-Object { $_.hole_number }) -join ","
        Write-Host "    Holes: $holes"
    }
}

# 4. Check if hole 1 exists
Write-Host "`n4. HOLE 1 CHECK:" -ForegroundColor Yellow
foreach ($sc in $scorecards) {
    $hole1 = Invoke-RestMethod "$base/scores?select=hole_number,gross_score,net_score,stableford_points&scorecard_id=eq.$($sc.id)&hole_number=eq.1" -Headers $headers
    if ($hole1) {
        Write-Host "  $($sc.player_name): Hole 1 = Gross $($hole1.gross_score), Net $($hole1.net_score), Pts $($hole1.stableford_points)" -ForegroundColor Green
    } else {
        Write-Host "  $($sc.player_name): HOLE 1 MISSING!" -ForegroundColor Red
    }
}

Write-Host "`n=== DIAGNOSIS ===" -ForegroundColor Cyan
if ($event.status -eq "draft") {
    Write-Host "Event status is 'draft' - may need to change to 'active'" -ForegroundColor Yellow
}
if ($event.is_private -eq $true) {
    Write-Host "Event is_private=true - this shouldn't affect Spectate Live" -ForegroundColor Yellow
}
