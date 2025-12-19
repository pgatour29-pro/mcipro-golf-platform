$h = @{
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
    'Content-Type' = 'application/json'
}

$body = @{
    p_search_query = ''
    p_society_id = $null
    p_handicap_min = $null
    p_handicap_max = $null
    p_limit = 10
    p_offset = 0
} | ConvertTo-Json

$url = 'https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rpc/search_players_global'
try {
    $result = Invoke-RestMethod -Uri $url -Headers $h -Method POST -Body $body
    $result | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Response: $($_.ErrorDetails.Message)"
}
