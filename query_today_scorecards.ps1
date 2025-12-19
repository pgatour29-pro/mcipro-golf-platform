$h = @{
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
}
# Query today's scorecards with player_id
$url = 'https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scorecards?select=id,player_id,player_name,event_id,total_gross&order=created_at.desc&limit=10'
$result = Invoke-RestMethod -Uri $url -Headers $h
$result | ConvertTo-Json -Depth 5
