$apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
$h = @{
    'apikey' = $apiKey
    'Authorization' = "Bearer $apiKey"
}

$url = 'https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?select=line_user_id,display_name,profile_data&order=display_name'
$users = Invoke-RestMethod -Uri $url -Headers $h

$targetNames = @('Tristan', 'Billy', 'Alan', 'Jason', 'Rocky', 'Willy', 'JOA', 'Kang')

Write-Host "LINE NOTIFICATION STATUS"
Write-Host "========================="
Write-Host ""

foreach ($user in $users) {
    # Get name from display_name or profile_data
    $name = $user.display_name
    if (-not $name -and $user.profile_data) {
        if ($user.profile_data.personalInfo) {
            $first = $user.profile_data.personalInfo.firstName
            $last = $user.profile_data.personalInfo.lastName
            if ($first -or $last) {
                $name = "$first $last".Trim()
            }
        }
        if (-not $name -and $user.profile_data.username) {
            $name = $user.profile_data.username
        }
    }
    if (-not $name) { $name = $user.line_user_id }

    # Check if this is a target user
    $isTarget = $false
    foreach ($t in $targetNames) {
        if ($name -like "*$t*") { $isTarget = $true; break }
    }

    if ($isTarget) {
        $lineNotif = 'NOT SET'
        $pushNotif = 'NOT SET'

        if ($user.profile_data -and $user.profile_data.notifications) {
            $notif = $user.profile_data.notifications
            if ($null -ne $notif.line_enabled) {
                $lineNotif = if ($notif.line_enabled) { 'ENABLED' } else { 'DISABLED' }
            }
            if ($null -ne $notif.push_enabled) {
                $pushNotif = if ($notif.push_enabled) { 'ENABLED' } else { 'DISABLED' }
            }
        }

        $lineId = $user.line_user_id
        Write-Host "$name"
        Write-Host "  LINE ID: $lineId"
        Write-Host "  LINE Notifications: $lineNotif"
        Write-Host "  Push Notifications: $pushNotif"
        Write-Host ""
    }
}

# Also list ALL users with LINE notifications enabled
Write-Host ""
Write-Host "ALL USERS WITH NOTIFICATIONS CONFIGURED:"
Write-Host "========================================="
foreach ($user in $users) {
    if ($user.profile_data -and $user.profile_data.notifications) {
        $notif = $user.profile_data.notifications
        if ($notif.line_enabled -or $notif.push_enabled) {
            $name = $user.display_name
            if (-not $name -and $user.profile_data.personalInfo) {
                $first = $user.profile_data.personalInfo.firstName
                $last = $user.profile_data.personalInfo.lastName
                $name = "$first $last".Trim()
            }
            if (-not $name) { $name = $user.line_user_id }

            $lineStatus = if ($notif.line_enabled) { "LINE:ON" } else { "LINE:OFF" }
            $pushStatus = if ($notif.push_enabled) { "PUSH:ON" } else { "PUSH:OFF" }
            Write-Host "  $name - $lineStatus, $pushStatus"
        }
    }
}
