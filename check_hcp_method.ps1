$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
}

$peteLineId = "U2b6d976f19bca4b2f4374ae0e10ed873"

Write-Host "=== PETE'S SOCIETY_HANDICAPS RECORDS ===" -ForegroundColor Yellow

$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_handicaps?golfer_id=eq.$peteLineId&select=*&order=last_calculated_at.desc"
$records = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

$records | ForEach-Object {
    Write-Host ""
    Write-Host "Society ID: $($_.society_id)"
    Write-Host "  Handicap Index: $($_.handicap_index)"
    Write-Host "  Calculation Method: $($_.calculation_method)"
    Write-Host "  Last Calculated: $($_.last_calculated_at)"
}
