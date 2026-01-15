$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Content-Type" = "application/json"
}

Write-Host "=== FINDING RYAN THOMAS AND PLUTO ===" -ForegroundColor Yellow
Write-Host ""

# Get sample golf_buddies to see structure
Write-Host "Getting golf_buddies table structure..." -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/golf_buddies?select=*&limit=5"
$sample = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
Write-Host "Sample golf_buddies records:" -ForegroundColor White
$sample | Format-List

# Search in TRGG players with names
Write-Host "`nSearching for Ryan in all TRGG player names..." -ForegroundColor Cyan
$trggId = "7c0e4b72-d925-44bc-afda-38259a7ba346"

# Get all TRGG society members with their profile info
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_members?society_id=eq.$trggId&select=golfer_id,display_name,member_status"
$members = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
Write-Host "Found $($members.Count) TRGG members" -ForegroundColor White

# Filter for Ryan and Pluto
$ryan = $members | Where-Object { $_.display_name -like "*Ryan*" -or $_.display_name -like "*Thomas*" }
$pluto = $members | Where-Object { $_.display_name -like "*Pluto*" }

Write-Host "`nRyan Thomas matches:" -ForegroundColor Green
$ryan | ForEach-Object {
    Write-Host "  Golfer ID: $($_.golfer_id)" -ForegroundColor White
    Write-Host "  Name: $($_.display_name)" -ForegroundColor White
    Write-Host "  Status: $($_.member_status)" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "Pluto matches:" -ForegroundColor Green
$pluto | ForEach-Object {
    Write-Host "  Golfer ID: $($_.golfer_id)" -ForegroundColor White
    Write-Host "  Name: $($_.display_name)" -ForegroundColor White
    Write-Host "  Status: $($_.member_status)" -ForegroundColor Gray
    Write-Host ""
}

# Get their current society handicaps
if ($ryan) {
    $ryanId = $ryan[0].golfer_id
    $url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_handicaps?society_id=eq.$trggId&golfer_id=eq.$ryanId&select=*"
    $ryanHcp = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
    Write-Host "Ryan's current TRGG handicap:" -ForegroundColor Cyan
    $ryanHcp | Format-List
}

if ($pluto) {
    $plutoId = $pluto[0].golfer_id
    $url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_handicaps?society_id=eq.$trggId&golfer_id=eq.$plutoId&select=*"
    $plutoHcp = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
    Write-Host "Pluto's current TRGG handicap:" -ForegroundColor Cyan
    $plutoHcp | Format-List
}

Write-Host "=== DONE ===" -ForegroundColor Yellow
