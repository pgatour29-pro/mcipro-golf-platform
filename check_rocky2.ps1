$h = @{
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
}

# Find Rocky Jones user profile - simpler query
$url = 'https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?display_name=ilike.*rocky*&select=line_user_id,display_name,name,handicap,handicap_index,profile_data'
$profiles = Invoke-RestMethod -Uri $url -Headers $h
Write-Host "Rocky Jones profiles found: $($profiles.Count)"
$profiles | ConvertTo-Json -Depth 5
