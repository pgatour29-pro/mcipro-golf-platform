$h = @{
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
}

# Check society_events for each society
$societies = @(
    @{ id = '17451cf3-f499-4aa3-83d7-c206149838c4'; name = 'TRGG-1' },
    @{ id = '7c0e4b72-d925-44bc-afda-38259a7ba346'; name = 'TRGG-2' }
)

foreach ($s in $societies) {
    $url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_events?society_id=eq.$($s.id)&select=id"
    $events = Invoke-RestMethod -Uri $url -Headers $h
    Write-Host "$($s.name) ($($s.id)): $($events.Count) events"
}

# Check society_members for each
foreach ($s in $societies) {
    $url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_members?society_id=eq.$($s.id)&select=id"
    $members = Invoke-RestMethod -Uri $url -Headers $h
    Write-Host "$($s.name) members: $($members.Count)"
}
