$h = @{
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
}

$url = 'https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_events?select=id,title,society_id,organizer_name&order=created_at.desc&limit=15'
$events = Invoke-RestMethod -Uri $url -Headers $h
$events | ForEach-Object { Write-Host "$($_.title) | society_id: $($_.society_id) | organizer: $($_.organizer_name)" }
