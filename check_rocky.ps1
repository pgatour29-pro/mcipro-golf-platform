$h = @{
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
}

# Find Rocky Jones user profile
$url = 'https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?or=(display_name.ilike.*rocky*,name.ilike.*rocky*)&select=line_user_id,display_name,name,handicap,handicap_index,profile_data'
$profiles = Invoke-RestMethod -Uri $url -Headers $h
Write-Host "Rocky Jones profiles:"
$profiles | ForEach-Object {
    $hcp = $_.handicap_index
    if (-not $hcp) { $hcp = $_.handicap }
    $golfInfoHcp = $_.profile_data.golfInfo.handicap
    Write-Host "  ID: $($_.line_user_id)"
    Write-Host "  Name: $($_.display_name) / $($_.name)"
    Write-Host "  handicap column: $($_.handicap)"
    Write-Host "  handicap_index column: $($_.handicap_index)"
    Write-Host "  golfInfo.handicap: $golfInfoHcp"
    Write-Host ""
}

# Check rounds for Rocky
if ($profiles.Count -gt 0) {
    $rockyId = $profiles[0].line_user_id
    Write-Host "Checking rounds for: $rockyId"
    $roundsUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?golfer_id=eq.$rockyId&select=*"
    $rounds = Invoke-RestMethod -Uri $roundsUrl -Headers $h
    Write-Host "Found $($rounds.Count) rounds"
    $rounds | ForEach-Object {
        Write-Host "  $($_.played_at) | Gross: $($_.total_gross) | $($_.course_name)"
    }
}
