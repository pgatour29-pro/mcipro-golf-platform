$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
}

$alanId = "U214f2fe47e1681fbb26f0aba95930d64"

Write-Host "=== ALAN THOMAS HANDICAP VERIFICATION ===" -ForegroundColor Yellow

# Check society_handicaps table
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_handicaps?golfer_id=eq.$alanId&select=society_id,handicap_index,calculation_method"
$hcps = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

Write-Host ""
Write-Host "Society Handicaps Table:" -ForegroundColor Cyan
$hcps | ForEach-Object {
    $label = if ($_.society_id) { "TRGG" } else { "Universal" }
    Write-Host "  $label : $($_.handicap_index)"
}

# Check profile_data
Write-Host ""
Write-Host "Profile Data:" -ForegroundColor Cyan
$url2 = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?line_user_id=eq.$alanId&select=profile_data"
$profile = Invoke-RestMethod -Uri $url2 -Headers $headers -Method Get

if ($profile -and $profile[0].profile_data) {
    $pd = $profile[0].profile_data
    Write-Host "  golfInfo.handicap: $($pd.golfInfo.handicap)"
    Write-Host "  profile_data.handicap: $($pd.handicap)"
}

Write-Host ""
Write-Host "Expected values: Universal 11.1, TRGG 10.9" -ForegroundColor Green
