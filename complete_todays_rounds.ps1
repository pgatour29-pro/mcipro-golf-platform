$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

Write-Host "=== COMPLETE TODAY'S ROUNDS (2026-01-14) ===" -ForegroundColor Yellow
Write-Host ""

# Step 1: Get all incomplete scorecards from today
Write-Host "Fetching incomplete scorecards from today..." -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scorecards?created_at=gte.2026-01-14&status=eq.in_progress&select=id,player_id,player_name,event_id,course_name,total_gross,total_net,started_at"
$scorecards = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

if ($scorecards.Count -eq 0) {
    Write-Host "No incomplete scorecards found from today." -ForegroundColor Green
    exit 0
}

Write-Host "Found $($scorecards.Count) incomplete scorecards:" -ForegroundColor Yellow
$scorecards | ForEach-Object {
    Write-Host "  - $($_.player_name): $($_.course_name), Gross: $($_.total_gross), Started: $($_.started_at)"
}
Write-Host ""

# Step 2: Get scores for each scorecard to calculate totals
Write-Host "Processing each scorecard..." -ForegroundColor Cyan
Write-Host ""

foreach ($card in $scorecards) {
    Write-Host "Processing: $($card.player_name) (ID: $($card.id))" -ForegroundColor White

    # Get scores for this scorecard
    $scoresUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scores?scorecard_id=eq.$($card.id)&select=hole_number,gross_score,stableford_points&order=hole_number"
    $scores = Invoke-RestMethod -Uri $scoresUrl -Headers $headers -Method Get

    if ($scores.Count -eq 0) {
        Write-Host "  ⚠️  No scores found - skipping" -ForegroundColor Yellow
        continue
    }

    # Calculate totals from database scores
    $totalGross = ($scores | Measure-Object -Property gross_score -Sum).Sum
    $totalStableford = ($scores | Measure-Object -Property stableford_points -Sum).Sum
    $holesPlayed = $scores.Count

    Write-Host "  Holes: $holesPlayed, Gross: $totalGross, Stableford: $totalStableford" -ForegroundColor Gray

    # Step 3: Update scorecard to completed status
    $updateUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scorecards?id=eq.$($card.id)"
    $updateBody = @{
        status = "completed"
        completed_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        total_gross = $totalGross
        total_net = $null
    } | ConvertTo-Json

    try {
        $updated = Invoke-RestMethod -Uri $updateUrl -Headers $headers -Method PATCH -Body $updateBody
        Write-Host "  ✅ Scorecard marked as completed" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ Failed to update scorecard: $_" -ForegroundColor Red
        continue
    }

    # Step 4: Create round in rounds table
    Write-Host "  Creating round in history..." -ForegroundColor Gray

    $roundUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds"
    $roundBody = @{
        golfer_id = $card.player_id
        course_id = if ($card.course_name -like "*Green Valley*") { "green_valley_rayong" }
                   elseif ($card.course_name -like "*Royal Lakeside*") { "royal_lakeside" }
                   else { "unknown" }
        course_name = $card.course_name
        type = if ($card.event_id) { "society" } else { "private" }
        society_event_id = $card.event_id
        played_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        started_at = $card.started_at
        completed_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        status = "completed"
        total_gross = $totalGross
        total_net = $null
        total_stableford = $totalStableford
        handicap_used = 0
        tee_marker = "white"
        course_rating = 72.0
        slope_rating = 113
        holes_played = $holesPlayed
        scoring_formats = @("stableford")
        format_scores = @{
            stableford = $totalStableford
        }
    } | ConvertTo-Json -Depth 5

    try {
        $round = Invoke-RestMethod -Uri $roundUrl -Headers $headers -Method POST -Body $roundBody
        Write-Host "  ✅ Round created in history!" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ Failed to create round: $_" -ForegroundColor Red
    }

    Write-Host ""
}

Write-Host "=== DONE ===" -ForegroundColor Yellow
Write-Host "Check your Round History tab in the app to see the completed rounds." -ForegroundColor Cyan
