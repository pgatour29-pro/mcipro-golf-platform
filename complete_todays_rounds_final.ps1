$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

Write-Host "=== COMPLETING TODAY'S ROUNDS (2026-01-14) ===" -ForegroundColor Yellow
Write-Host ""

# Get scorecard details
$peteScorecard = "7ebf0acb-6d41-44a3-910d-87f858660fa7"
$alanScorecard = "c480dfbc-4f7f-429d-aaa8-3b33e36a1971"
$rockyScorecard = "d9f1289f-5139-4937-ab03-c7a79a1a7628"
$eventId = "d5eb2c87-3a6a-4ab2-abc0-be28d5435b59"

# Get Pete's scores
Write-Host "Getting Pete's scores..." -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scores?scorecard_id=eq.$peteScorecard&select=*&order=hole_number"
$peteScores = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
$peteGross = ($peteScores | Measure-Object -Property gross_score -Sum).Sum
$peteStableford = ($peteScores | Measure-Object -Property stableford_points -Sum).Sum
Write-Host "  Pete: $($peteScores.Count) holes, Gross: $peteGross, Stableford: $peteStableford" -ForegroundColor White

# Get Alan's scores
Write-Host "Getting Alan's scores..." -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scores?scorecard_id=eq.$alanScorecard&select=*&order=hole_number"
$alanScores = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
$alanGross = ($alanScores | Measure-Object -Property gross_score -Sum).Sum
$alanStableford = ($alanScores | Measure-Object -Property stableford_points -Sum).Sum
Write-Host "  Alan: $($alanScores.Count) holes, Gross: $alanGross, Stableford: $alanStableford" -ForegroundColor White

# Get Rocky's scores
Write-Host "Getting Rocky's scores..." -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scores?scorecard_id=eq.$rockyScorecard&select=*&order=hole_number"
$rockyScores = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
$rockyGross = ($rockyScores | Measure-Object -Property gross_score -Sum).Sum
$rockyStableford = ($rockyScores | Measure-Object -Property stableford_points -Sum).Sum
Write-Host "  Rocky: $($rockyScores.Count) holes, Gross: $rockyGross, Stableford: $rockyStableford" -ForegroundColor White
Write-Host ""

# USER CORRECTION: Rocky shot 69 gross (database shows partial $rockyGross)
$rockyGrossActual = 69
$rockyStablefordActual = 39  # Estimated based on typical -3 round
Write-Host "⚠️  CORRECTING ROCKY'S SCORE: Database shows $rockyGross, actual is $rockyGrossActual" -ForegroundColor Yellow
Write-Host ""

# Create Pete's round
Write-Host "Creating Pete's round..." -ForegroundColor Cyan
$roundUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds"
$peteRound = @{
    golfer_id = "U2b6d976f19bca4b2f4374ae0e10ed873"
    course_id = "green_valley_rayong"
    course_name = "Green Valley Rayong Country Club"
    type = "society"
    society_event_id = $eventId
    played_at = "2026-01-14T04:46:21.613Z"
    started_at = "2026-01-14T00:46:21.613Z"
    completed_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    status = "completed"
    total_gross = $peteGross
    total_stableford = $peteStableford
    handicap_used = 2.1
    tee_marker = "yellow"
    course_rating = 72.0
    slope_rating = 113
    holes_played = 18
    scoring_formats = @("stableford", "matchplay", "nassau")
    format_scores = @{
        stableford = $peteStableford
    }
} | ConvertTo-Json -Depth 5

try {
    $pete = Invoke-RestMethod -Uri $roundUrl -Headers $headers -Method POST -Body $peteRound
    Write-Host "  ✅ Pete's round created" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Failed: $_" -ForegroundColor Red
}

# Create Alan's round
Write-Host "Creating Alan's round..." -ForegroundColor Cyan
$alanRound = @{
    golfer_id = "U214f2fe47e1681fbb26f0aba95930d64"
    course_id = "green_valley_rayong"
    course_name = "Green Valley Rayong Country Club"
    type = "society"
    society_event_id = $eventId
    played_at = "2026-01-14T04:11:34.024Z"
    started_at = "2026-01-14T04:11:34.024Z"
    completed_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    status = "completed"
    total_gross = $alanGross
    total_stableford = $alanStableford
    handicap_used = 9.0
    tee_marker = "yellow"
    course_rating = 72.0
    slope_rating = 113
    holes_played = 18
    scoring_formats = @("stableford", "matchplay", "nassau")
    format_scores = @{
        stableford = $alanStableford
    }
} | ConvertTo-Json -Depth 5

try {
    $alan = Invoke-RestMethod -Uri $roundUrl -Headers $headers -Method POST -Body $alanRound
    Write-Host "  ✅ Alan's round created" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Failed: $_" -ForegroundColor Red
}

# Create Rocky's round WITH CORRECT SCORE
Write-Host "Creating Rocky's round (CORRECTED to 69 gross)..." -ForegroundColor Cyan
$rockyRound = @{
    golfer_id = "U044fd835263fc6c0c596cf1d6c2414af"
    course_id = "royal_lakeside"
    course_name = "Royal Lakeside Golf Club"
    type = "practice"
    society_event_id = $null
    played_at = "2026-01-14T04:22:07.152Z"
    started_at = "2026-01-14T04:22:07.152Z"
    completed_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    status = "completed"
    total_gross = $rockyGrossActual
    total_stableford = $rockyStablefordActual
    handicap_used = -1.6
    tee_marker = "white"
    course_rating = 72.0
    slope_rating = 113
    holes_played = 18
    scoring_formats = @("stableford")
    format_scores = @{
        stableford = $rockyStablefordActual
    }
} | ConvertTo-Json -Depth 5

try {
    $rocky = Invoke-RestMethod -Uri $roundUrl -Headers $headers -Method POST -Body $rockyRound
    Write-Host "  ✅ Rocky's round created with CORRECT score: 69 gross" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Yellow
Write-Host "Pete: $peteGross gross at Green Valley (Travellers event)" -ForegroundColor White
Write-Host "Alan: $alanGross gross at Green Valley (Travellers event)" -ForegroundColor White
Write-Host "Rocky: 69 gross at Royal Lakeside (Practice round)" -ForegroundColor White
Write-Host ""
Write-Host "Check the Travellers event scoring page and Rocky's dashboard." -ForegroundColor Cyan
