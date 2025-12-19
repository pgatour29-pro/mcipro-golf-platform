$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Content-Type" = "application/json"
}
$base = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1"

Write-Host "=== USERS WITH LINE NOTIFICATIONS ENABLED ===" -ForegroundColor Cyan

# Query users who have messaging_user_id set (LINE push notifications require this)
$users = Invoke-RestMethod "$base/user_profiles?select=line_user_id,name,messaging_user_id,created_at&messaging_user_id=not.is.null&order=name.asc" -Headers $headers

Write-Host "`nTotal users with LINE notifications: $($users.Count)" -ForegroundColor Green
Write-Host ""

$users | Format-Table name, messaging_user_id, line_user_id -AutoSize
