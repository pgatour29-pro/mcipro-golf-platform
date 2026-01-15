$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Content-Type" = "application/json"
}

$bubbaId = "U9e64d5456b0582e81743c87fa48c21e2"

Write-Host "=== CHECKING notification_preferences TABLE ===" -ForegroundColor Yellow
Write-Host ""

# Check if table exists and get Bubba's settings
try {
    $url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/notification_preferences?user_id=eq.$bubbaId&select=*"
    $bubba = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
    
    if ($bubba.Count -gt 0) {
        Write-Host "✅ Bubba HAS a notification_preferences record:" -ForegroundColor Green
        $bubba[0] | ConvertTo-Json -Depth 5
    } else {
        Write-Host "❌ Bubba has NO notification_preferences record" -ForegroundColor Red
    }
} catch {
    Write-Host "⚠️  notification_preferences table does not exist or error:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host ""
Write-Host "Checking ALL users with notify_announcements enabled..." -ForegroundColor Cyan
try {
    $url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/notification_preferences?notify_announcements=eq.true&select=user_id"
    $enabled = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
    Write-Host "Users with announcements enabled: $($enabled.Count)" -ForegroundColor White
} catch {
    Write-Host "Error fetching enabled users: $($_.Exception.Message)" -ForegroundColor Red
}
