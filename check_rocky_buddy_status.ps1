$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Content-Type" = "application/json"
}

Write-Host "=== CHECKING IF ROCKY IS ALREADY A BUDDY ===" -ForegroundColor Yellow
Write-Host ""

$peteId = "U2b6d976f19bca4b2f4374ae0e10ed873"
$rockyId = "U044fd835263fc6c0c596cf1d6c2414af"

# Check if Rocky is in Pete's buddy list
Write-Host "Checking if Rocky ($rockyId) is in Pete's ($peteId) buddy list..." -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/golf_buddies?user_id=eq.$peteId&buddy_id=eq.$rockyId&select=*"
$buddyRecord = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

if ($buddyRecord.Count -gt 0) {
    Write-Host "✅ YES - Rocky IS already in Pete's buddy list!" -ForegroundColor Green
    Write-Host "  Record:" -ForegroundColor White
    $buddyRecord | Format-List
    Write-Host ""
    Write-Host "⚠️  THIS IS WHY Rocky doesn't show in search!" -ForegroundColor Yellow
    Write-Host "The search filters out existing buddies (line 674-678)" -ForegroundColor White
} else {
    Write-Host "❌ NO - Rocky is NOT in Pete's buddy list" -ForegroundColor Red
    Write-Host "This is NOT the reason for search failure" -ForegroundColor White
}

Write-Host ""
Write-Host "Let's also check ALL of Pete's buddies..." -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/golf_buddies?user_id=eq.$peteId&select=buddy_id"
$allBuddies = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
Write-Host "Pete has $($allBuddies.Count) buddies total" -ForegroundColor White
$allBuddies | ForEach-Object {
    Write-Host "  - $($_.buddy_id)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Yellow
