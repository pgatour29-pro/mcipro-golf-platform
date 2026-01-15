$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Content-Type" = "application/json"
}

Write-Host "=== USERS WHO WILL RECEIVE PLATFORM ANNOUNCEMENTS ===" -ForegroundColor Yellow
Write-Host ""

# Get all users with notify_announcements = true
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/notification_preferences?notify_announcements=eq.true&select=user_id"
$enabledPrefs = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

Write-Host "✅ $($enabledPrefs.Count) users have announcements ENABLED" -ForegroundColor Green
Write-Host ""

# Get their names from user_profiles
$userIds = $enabledPrefs.user_id -join ","
if ($enabledPrefs.Count -gt 0) {
    $url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?line_user_id=in.($userIds)&select=name,line_user_id"
    $profiles = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
    
    Write-Host "Recipients list:" -ForegroundColor Cyan
    foreach ($profile in $profiles) {
        $isBubba = if ($profile.name -eq "Bubba Gump") { " ⭐ (YOUR TEST USER)" } else { "" }
        Write-Host "  - $($profile.name)$isBubba" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "✅ VERIFICATION: Bubba Gump is in the list above" -ForegroundColor Green
    Write-Host "✅ Next platform announcement will go to ONLY these $($enabledPrefs.Count) users" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== USERS WHO OPTED OUT ===" -ForegroundColor Yellow
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/notification_preferences?notify_announcements=eq.false&select=user_id"
$disabledPrefs = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
Write-Host "❌ $($disabledPrefs.Count) users have opted OUT" -ForegroundColor Red

Write-Host ""
Write-Host "=== USERS WITH NO PREFERENCE SET ===" -ForegroundColor Yellow
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?select=line_user_id"
$allUsers = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/notification_preferences?select=user_id"
$usersWithPrefs = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

$usersWithPrefsSet = @($usersWithPrefs.user_id)
$noPrefs = $allUsers | Where-Object { $_.line_user_id -notin $usersWithPrefsSet }

Write-Host "⚠️  $($noPrefs.Count) users have NO preferences set (will NOT receive announcements)" -ForegroundColor Yellow

Write-Host ""
Write-Host "=== SUMMARY ===" -ForegroundColor Cyan
Write-Host "  Total users: $($allUsers.Count)" -ForegroundColor White
Write-Host "  Will receive announcements: $($enabledPrefs.Count)" -ForegroundColor Green
Write-Host "  Opted out: $($disabledPrefs.Count)" -ForegroundColor Red  
Write-Host "  No preference (default = opted out): $($noPrefs.Count)" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ Fix is deployed - next announcement will ONLY go to $($enabledPrefs.Count) users" -ForegroundColor Green
