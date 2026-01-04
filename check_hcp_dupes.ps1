$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
}

$peteLineId = "U2b6d976f19bca4b2f4374ae0e10ed873"
$trggSocietyId = "7c0e4b72-d925-44bc-afda-38259a7ba346"

Write-Host "=== ALL SOCIETY_HANDICAPS FOR PETE (check for duplicates) ===" -ForegroundColor Yellow

$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_handicaps?golfer_id=eq.$peteLineId&select=*&order=last_calculated_at.desc"
$records = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

Write-Host "Total records: $($records.Count)"
Write-Host ""

$records | ForEach-Object {
    $societyLabel = if ($_.society_id) { $_.society_id.Substring(0,8) } else { "UNIVERSAL" }
    Write-Host "$societyLabel | HCP: $($_.handicap_index) | Method: $($_.calculation_method) | Time: $($_.last_calculated_at)"
}

Write-Host ""
Write-Host "=== CHECK FOR DUPLICATE SOCIETY IDS ===" -ForegroundColor Cyan

$universalCount = ($records | Where-Object { $_.society_id -eq $null }).Count
$trggCount = ($records | Where-Object { $_.society_id -eq $trggSocietyId }).Count

Write-Host "Universal (null) records: $universalCount"
Write-Host "TRGG society records: $trggCount"

if ($universalCount -gt 1 -or $trggCount -gt 1) {
    Write-Host ""
    Write-Host "!!! DUPLICATES DETECTED !!!" -ForegroundColor Red
}
