$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Content-Type" = "application/json"
}

Write-Host "=== FINDING ROCKY JONES ===" -ForegroundColor Yellow
Write-Host ""

# Search user_profiles for Rocky
Write-Host "Searching user_profiles for 'Rocky'..." -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?name=ilike.*rocky*&select=line_user_id,name,display_name"
$rocky = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
Write-Host "Found $($rocky.Count) profiles with 'Rocky':" -ForegroundColor White
$rocky | ForEach-Object {
    Write-Host "  line_user_id: $($_.line_user_id)" -ForegroundColor Green
    Write-Host "  name: $($_.name)" -ForegroundColor White
    Write-Host "  display_name: $($_.display_name)" -ForegroundColor White
    Write-Host ""
}

# Search for 'Jones'
Write-Host "Searching user_profiles for 'Jones'..." -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?name=ilike.*jones*&select=line_user_id,name,display_name"
$jones = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
Write-Host "Found $($jones.Count) profiles with 'Jones':" -ForegroundColor White
$jones | ForEach-Object {
    Write-Host "  line_user_id: $($_.line_user_id)" -ForegroundColor Green
    Write-Host "  name: $($_.name)" -ForegroundColor White
    Write-Host "  display_name: $($_.display_name)" -ForegroundColor White
    Write-Host ""
}

# Known Rocky ID from previous sessions
$rockyId = "U044fd835263fc6c0c596cf1d6c2414af"
Write-Host "Checking known Rocky ID: $rockyId" -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?line_user_id=eq.$rockyId&select=*"
$rockyProfile = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
if ($rockyProfile.Count -gt 0) {
    Write-Host "✅ Found Rocky's profile:" -ForegroundColor Green
    Write-Host "  line_user_id: $($rockyProfile[0].line_user_id)" -ForegroundColor White
    Write-Host "  name: $($rockyProfile[0].name)" -ForegroundColor White
    Write-Host "  display_name: $($rockyProfile[0].display_name)" -ForegroundColor White
    Write-Host "  email: $($rockyProfile[0].email)" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "❌ Rocky ID not found in user_profiles" -ForegroundColor Red
}

Write-Host "=== DONE ===" -ForegroundColor Yellow
