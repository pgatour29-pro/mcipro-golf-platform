$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
}

$peteId = "U2b6d976f19bca4b2f4374ae0e10ed873"

# Get Pete's recent rounds
$roundsUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?golfer_id=eq.$peteId&select=id,course_name,played_at,total_gross,total_stableford&order=played_at.desc&limit=5"
$rounds = Invoke-RestMethod -Uri $roundsUrl -Headers $headers -Method Get

Write-Host "=== PETE'S RECENT ROUNDS ===" -ForegroundColor Cyan
foreach ($round in $rounds) {
    Write-Host "`nRound: $($round.id)" -ForegroundColor Yellow
    Write-Host "  Course: $($round.course_name)"
    Write-Host "  Date: $($round.played_at)"
    Write-Host "  Gross: $($round.total_gross), Stableford: $($round.total_stableford)"
    
    # Check for hole data
    $holesUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/round_holes?round_id=eq.$($round.id)&select=hole_number,par,gross_score,net_score,stableford_points&order=hole_number"
    $holes = Invoke-RestMethod -Uri $holesUrl -Headers $headers -Method Get
    
    if ($holes -and $holes.Count -gt 0) {
        Write-Host "  Holes data: $($holes.Count) holes" -ForegroundColor Green
    } else {
        Write-Host "  Holes data: NONE" -ForegroundColor Red
    }
}
