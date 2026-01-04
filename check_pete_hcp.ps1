$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
}

$peteId = "U2b6d976f19bca4b2f4374ae0e10ed873"

Write-Host "=== PETE PARK HANDICAP VERIFICATION ===" -ForegroundColor Yellow

$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_handicaps?golfer_id=eq.$peteId&select=society_id,handicap_index"
$hcps = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

Write-Host ""
Write-Host "Society Handicaps Table:" -ForegroundColor Cyan
$hcps | ForEach-Object {
    $label = if ($_.society_id) { "TRGG" } else { "Universal" }
    Write-Host "  $label : $($_.handicap_index)"
}

Write-Host ""
Write-Host "Expected values: Universal 3.6, TRGG 2.5" -ForegroundColor Green
