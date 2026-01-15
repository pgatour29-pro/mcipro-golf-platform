$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

Write-Host "=== ADDING PETE'S UNIVERSAL HANDICAP ===" -ForegroundColor Yellow
Write-Host ""

$peteId = "U2b6d976f19bca4b2f4374ae0e10ed873"

Write-Host "Creating universal handicap record for Pete..." -ForegroundColor Cyan
Write-Host "  golfer_id: $peteId" -ForegroundColor White
Write-Host "  society_id: null (universal)" -ForegroundColor White
Write-Host "  handicap_index: 3.2" -ForegroundColor White
Write-Host ""

$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_handicaps"
$body = @{
    golfer_id = $peteId
    society_id = $null
    handicap_index = 3.2
    last_calculated_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
} | ConvertTo-Json

try {
    $result = Invoke-RestMethod -Uri $url -Headers $headers -Method POST -Body $body
    Write-Host "✅ SUCCESS! Pete's universal handicap created:" -ForegroundColor Green
    $result | Format-List
} catch {
    Write-Host "❌ Failed: $_" -ForegroundColor Red
    Write-Host "Error details:" -ForegroundColor Yellow
    Write-Host $_.ErrorDetails.Message
}

Write-Host ""
Write-Host "=== VERIFYING ===" -ForegroundColor Yellow
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_handicaps?golfer_id=eq.$peteId&select=society_id,handicap_index&order=last_calculated_at.desc"
$allHcps = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
Write-Host "Pete's handicap records (all):" -ForegroundColor White
$allHcps | ForEach-Object {
    $societyName = if ($_.society_id) { "TRGG: $($_.society_id)" } else { "UNIVERSAL (null)" }
    Write-Host "  $societyName = $($_.handicap_index)" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Yellow
Write-Host "Pete should now switch handicaps correctly in the live scorecard dropdown!" -ForegroundColor Green
