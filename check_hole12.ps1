$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Content-Type" = "application/json"
}
$base = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1"
$eventId = "bdf4c783-73f9-477d-958a-5b2aba80b041"

Write-Host "=== HOLE 12 SCORES ===" -ForegroundColor Cyan

# Get scorecards
$scorecards = Invoke-RestMethod "$base/scorecards?select=id,player_name,handicap&event_id=eq.$eventId" -Headers $headers

foreach ($sc in $scorecards) {
    $hole12 = Invoke-RestMethod "$base/scores?select=hole_number,gross_score,net_score,par,stroke_index,stableford_points&scorecard_id=eq.$($sc.id)&hole_number=eq.12" -Headers $headers
    if ($hole12) {
        Write-Host "$($sc.player_name) (HCP $($sc.handicap)):" -ForegroundColor Yellow
        Write-Host "  Gross: $($hole12.gross_score), Net: $($hole12.net_score), Par: $($hole12.par), SI: $($hole12.stroke_index), Pts: $($hole12.stableford_points)"
    }
}
