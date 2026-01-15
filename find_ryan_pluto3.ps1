$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Content-Type" = "application/json"
}

Write-Host "=== FINDING RYAN THOMAS AND PLUTO ===" -ForegroundColor Yellow
Write-Host ""

# Get sample society_members to see structure
Write-Host "Getting society_members structure..." -ForegroundColor Cyan
$trggId = "7c0e4b72-d925-44bc-afda-38259a7ba346"
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_members?society_id=eq.$trggId&select=*&limit=3"
$sample = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
Write-Host "Sample structure:" -ForegroundColor White
$sample | Format-List

# Search user_profiles for Ryan and Pluto
Write-Host "`nSearching user_profiles for Ryan..." -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?display_name=ilike.*ryan*&select=*"
$ryan = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
Write-Host "Ryan matches: $($ryan.Count)" -ForegroundColor White
$ryan | ForEach-Object {
    Write-Host "  ID: $($_.id)" -ForegroundColor Green
    Write-Host "  Name: $($_.display_name)" -ForegroundColor White
    Write-Host "  Handicap: $($_.current_handicap_index)" -ForegroundColor White
    Write-Host ""
}

Write-Host "Searching user_profiles for Pluto..." -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?display_name=ilike.*pluto*&select=*"
$pluto = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
Write-Host "Pluto matches: $($pluto.Count)" -ForegroundColor White
$pluto | ForEach-Object {
    Write-Host "  ID: $($_.id)" -ForegroundColor Green
    Write-Host "  Name: $($_.display_name)" -ForegroundColor White
    Write-Host "  Handicap: $($_.current_handicap_index)" -ForegroundColor White
    Write-Host ""
}

# Also try searching scorecards for these names
Write-Host "Searching scorecards for Ryan Thomas..." -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scorecards?player_name=ilike.*ryan*thomas*&select=player_id,player_name&limit=5"
$scorecards = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
Write-Host "Found $($scorecards.Count) scorecards" -ForegroundColor White
$scorecards | ForEach-Object {
    Write-Host "  Player ID: $($_.player_id)" -ForegroundColor Green
    Write-Host "  Name: $($_.player_name)" -ForegroundColor White
    Write-Host ""
}

Write-Host "Searching scorecards for Pluto..." -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scorecards?player_name=ilike.*pluto*&select=player_id,player_name&limit=5"
$scorecards2 = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
Write-Host "Found $($scorecards2.Count) scorecards" -ForegroundColor White
$scorecards2 | ForEach-Object {
    Write-Host "  Player ID: $($_.player_id)" -ForegroundColor Green
    Write-Host "  Name: $($_.player_name)" -ForegroundColor White
    Write-Host ""
}

Write-Host "=== DONE ===" -ForegroundColor Yellow
