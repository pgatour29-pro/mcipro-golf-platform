$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Content-Type" = "application/json"
}

Write-Host "=== FINDING BUBBA GUMP ===" -ForegroundColor Yellow
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?name=ilike.*bubba*&select=name,line_user_id,profile_data"
$results = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

if ($results.Count -gt 0) {
    foreach ($user in $results) {
        Write-Host "Found: $($user.name)" -ForegroundColor Green
        Write-Host "LINE ID: $($user.line_user_id)" -ForegroundColor White
        Write-Host "Profile Data Keys:" -ForegroundColor Cyan
        $user.profile_data.PSObject.Properties.Name
        Write-Host ""
    }
} else {
    Write-Host "No users found with 'bubba' in name" -ForegroundColor Red
}
