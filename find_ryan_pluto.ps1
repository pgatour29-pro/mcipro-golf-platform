$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Content-Type" = "application/json"
}

Write-Host "=== FINDING RYAN THOMAS AND PLUTO ===" -ForegroundColor Yellow
Write-Host ""

# Search user_profiles
Write-Host "Searching user_profiles..." -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?or=(display_name.ilike.*ryan*thomas*,display_name.ilike.*pluto*)&select=*"
$profiles = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
Write-Host "Found $($profiles.Count) matches in user_profiles:" -ForegroundColor White
$profiles | ForEach-Object {
    Write-Host "  ID: $($_.id)" -ForegroundColor Green
    Write-Host "  Name: $($_.display_name)" -ForegroundColor White
    Write-Host "  Handicap: $($_.current_handicap_index)" -ForegroundColor White
    Write-Host ""
}

# Search golf_buddies
Write-Host "Searching golf_buddies..." -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/golf_buddies?or=(buddy_name.ilike.*ryan*thomas*,buddy_name.ilike.*pluto*)&select=*"
$buddies = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
Write-Host "Found $($buddies.Count) matches in golf_buddies:" -ForegroundColor White
$buddies | ForEach-Object {
    Write-Host "  Buddy ID: $($_.buddy_user_id)" -ForegroundColor Green
    Write-Host "  Name: $($_.buddy_name)" -ForegroundColor White
    Write-Host "  Handicap: $($_.buddy_handicap)" -ForegroundColor White
    Write-Host ""
}

# Check TRGG society_handicaps
Write-Host "Checking TRGG society handicaps..." -ForegroundColor Cyan
$trggId = "7c0e4b72-d925-44bc-afda-38259a7ba346"
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_handicaps?society_id=eq.$trggId&handicap_index=eq.0&select=golfer_id,handicap_index"
$trggHandicaps = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
Write-Host "Found $($trggHandicaps.Count) players with 0 handicap in TRGG" -ForegroundColor White
$trggHandicaps | Select-Object -First 20 | ForEach-Object {
    Write-Host "  Golfer ID: $($_.golfer_id)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Yellow
