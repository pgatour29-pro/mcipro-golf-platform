$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Content-Type" = "application/json"
}

Write-Host "=== CHECKING UNIVERSAL HANDICAPS ===" -ForegroundColor Yellow
Write-Host ""

# Get Pete's user profile
Write-Host "Checking Pete's user_profile..." -ForegroundColor Cyan
$peteId = "U2b6d976f19bca4b2f4374ae0e10ed873"
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?line_user_id=eq.$peteId&select=line_user_id,display_name,handicap_index"
$pete = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
Write-Host "Pete's profile:" -ForegroundColor White
$pete | Format-List

# Check if Pete has a universal handicap record
Write-Host "`nChecking universal handicap (society_id = null)..." -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_handicaps?golfer_id=eq.$peteId&is.society_id=null&select=*"
$universal = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
if ($universal.Count -gt 0) {
    Write-Host "✅ Pete HAS universal handicap:" -ForegroundColor Green
    $universal | Format-List
} else {
    Write-Host "❌ Pete has NO universal handicap record!" -ForegroundColor Red
    Write-Host "This is why his handicap doesn't change in the live scorecard dropdown." -ForegroundColor Yellow
}

# Check a few other users to see if this is common
Write-Host "`nChecking other users for comparison..." -ForegroundColor Cyan
$alanId = "U214f2fe47e1681fbb26f0aba95930d64"
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_handicaps?golfer_id=eq.$alanId&select=golfer_id,society_id,handicap_index"
$alanHcps = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
Write-Host "Alan Thomas handicaps:" -ForegroundColor White
$alanHcps | ForEach-Object {
    $societyName = if ($_.society_id) { "Society: $($_.society_id)" } else { "UNIVERSAL (null)" }
    Write-Host "  $societyName = $($_.handicap_index)" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "=== SOLUTION ===" -ForegroundColor Yellow
Write-Host "Pete needs a universal handicap record in society_handicaps with society_id = null" -ForegroundColor White
Write-Host "This should match his current TRGG handicap of 2.1" -ForegroundColor White

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Yellow
