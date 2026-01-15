$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Content-Type" = "application/json"
}

Write-Host "=== CHECKING LIVE ROUNDS STRUCTURE ===" -ForegroundColor Yellow
Write-Host ""

# Check scorecards table for active rounds
Write-Host "1. Checking scorecards table for in-progress rounds..." -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scorecards?status=eq.in_progress&select=id,player_id,status,is_public,created_at&order=created_at.desc&limit=5"
$activeCards = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

Write-Host "Active scorecards with status='in_progress': $($activeCards.Count)" -ForegroundColor White
if ($activeCards.Count -gt 0) {
    $activeCards | Format-Table -AutoSize
}

Write-Host ""
Write-Host "2. Checking for public live rounds (is_public=true)..." -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scorecards?status=eq.in_progress&is_public=eq.true&select=id,player_id,created_at"
$publicLive = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
Write-Host "Public live rounds: $($publicLive.Count)" -ForegroundColor Green

Write-Host ""
Write-Host "3. Sample scorecard structure..." -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scorecards?limit=1&select=*"
$sample = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
if ($sample.Count -gt 0) {
    Write-Host "Available columns:" -ForegroundColor White
    $sample[0].PSObject.Properties.Name | ForEach-Object { Write-Host "  - $_" }
}

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Yellow
