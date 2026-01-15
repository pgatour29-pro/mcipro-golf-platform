$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Content-Type" = "application/json"
}

Write-Host "=== CHECKING LINE NOTIFICATION SETTINGS ===" -ForegroundColor Yellow
Write-Host ""

$bubbaId = "Ub81f15a34d4c8c8b87c3a3cd91b1f88e"
$peteId = "U2b6d976f19bca4b2f4374ae0e10ed873"
$rockyId = "U044fd835263fc6c0c596cf1d6c2414af"

# Check Bubba's profile and notification settings
Write-Host "1. CHECKING BUBBA GUMP's NOTIFICATION SETTINGS" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?line_user_id=eq.$bubbaId&select=name,line_user_id,profile_data"
$bubba = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

if ($bubba.Count -gt 0) {
    Write-Host "Name: $($bubba[0].name)" -ForegroundColor White
    Write-Host "LINE User ID: $($bubba[0].line_user_id)" -ForegroundColor White
    
    $notifSettings = $bubba[0].profile_data.preferences.notifications
    if ($notifSettings) {
        Write-Host "Notification Settings:" -ForegroundColor Green
        $notifSettings | ConvertTo-Json -Depth 5
    } else {
        Write-Host "⚠️  NO notification settings found in profile_data.preferences.notifications" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Bubba not found!" -ForegroundColor Red
}

Write-Host ""
Write-Host "2. CHECKING PETE PARK's NOTIFICATION SETTINGS" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?line_user_id=eq.$peteId&select=name,line_user_id,profile_data"
$pete = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

if ($pete.Count -gt 0) {
    Write-Host "Name: $($pete[0].name)" -ForegroundColor White
    Write-Host "LINE User ID: $($pete[0].line_user_id)" -ForegroundColor White
    
    $notifSettings = $pete[0].profile_data.preferences.notifications
    if ($notifSettings) {
        Write-Host "Notification Settings:" -ForegroundColor Green
        $notifSettings | ConvertTo-Json -Depth 5
    } else {
        Write-Host "⚠️  NO notification settings found" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "3. CHECKING ROCKY's NOTIFICATION SETTINGS" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?line_user_id=eq.$rockyId&select=name,line_user_id,profile_data"
$rocky = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

if ($rocky.Count -gt 0) {
    Write-Host "Name: $($rocky[0].name)" -ForegroundColor White
    Write-Host "LINE User ID: $($rocky[0].line_user_id)" -ForegroundColor White
    
    $notifSettings = $rocky[0].profile_data.preferences.notifications
    if ($notifSettings) {
        Write-Host "Notification Settings:" -ForegroundColor Green
        $notifSettings | ConvertTo-Json -Depth 5
    } else {
        Write-Host "⚠️  NO notification settings found" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "4. CHECKING ALL USERS WITH NOTIFICATIONS ENABLED" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?select=name,line_user_id,profile_data"
$allUsers = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

Write-Host "Total users in database: $($allUsers.Count)" -ForegroundColor White
Write-Host ""

$enabledCount = 0
$disabledCount = 0
$noSettingsCount = 0

foreach ($user in $allUsers) {
    $notifs = $user.profile_data.preferences.notifications
    
    if ($notifs) {
        # Check if platform announcements are enabled
        if ($notifs.platformAnnouncements -eq $true) {
            $enabledCount++
            Write-Host "✅ $($user.name) - Platform Announcements: ENABLED" -ForegroundColor Green
        } else {
            $disabledCount++
            Write-Host "❌ $($user.name) - Platform Announcements: DISABLED" -ForegroundColor Red
        }
    } else {
        $noSettingsCount++
        Write-Host "⚠️  $($user.name) - NO notification settings" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "SUMMARY:" -ForegroundColor Yellow
Write-Host "  Enabled: $enabledCount" -ForegroundColor Green
Write-Host "  Disabled: $disabledCount" -ForegroundColor Red
Write-Host "  No Settings: $noSettingsCount" -ForegroundColor Yellow

Write-Host ""
Write-Host "5. CHECKING RECENT PLATFORM ANNOUNCEMENTS" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Check if there's a platform_announcements table
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/platform_announcements?select=*&order=created_at.desc&limit=5"
try {
    $announcements = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
    Write-Host "Recent announcements: $($announcements.Count)" -ForegroundColor White
    $announcements | Format-Table -AutoSize
} catch {
    Write-Host "⚠️  Could not fetch platform_announcements table" -ForegroundColor Yellow
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Yellow
