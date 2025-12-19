$h = @{
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
}

# Get all profiles without complex fields
$url = 'https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?select=line_user_id,display_name,name,handicap,handicap_index'
$profiles = Invoke-RestMethod -Uri $url -Headers $h

# Filter for Rocky locally
$rocky = $profiles | Where-Object { $_.display_name -like "*Rocky*" -or $_.name -like "*Rocky*" }
Write-Host "Rocky Jones profiles found: $($rocky.Count)"
$rocky | ForEach-Object {
    Write-Host "  ID: $($_.line_user_id)"
    Write-Host "  display_name: $($_.display_name)"
    Write-Host "  name: $($_.name)"
    Write-Host "  handicap: $($_.handicap)"
    Write-Host "  handicap_index: $($_.handicap_index)"
    Write-Host ""

    # Check rounds for this ID
    $roundsUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?golfer_id=eq.$($_.line_user_id)&select=id,course_name,total_gross,total_stableford,played_at"
    $rounds = Invoke-RestMethod -Uri $roundsUrl -Headers $h
    Write-Host "  Rounds: $($rounds.Count)"
    $rounds | ForEach-Object {
        Write-Host "    $($_.played_at) | Gross: $($_.total_gross) | Pts: $($_.total_stableford) | $($_.course_name)"
    }
}
