$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Content-Type" = "application/json"
}

$bubbaId = "U9e64d5456b0582e81743c87fa48c21e2"

Write-Host "=== BUBBA'S NOTIFICATION SETTINGS ===" -ForegroundColor Yellow
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?line_user_id=eq.$bubbaId&select=name,profile_data"
$bubba = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

Write-Host "Name: $($bubba[0].name)" -ForegroundColor White
Write-Host ""
Write-Host "preferences object:" -ForegroundColor Cyan
$bubba[0].profile_data.preferences | ConvertTo-Json -Depth 10
