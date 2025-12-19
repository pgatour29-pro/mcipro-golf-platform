$h = @{
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
}
# Query scores for today's scorecards
$url = 'https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scores?scorecard_id=in.(29612dfc-19b7-4192-8928-a08f365a604a,d0fa9b75-420a-4b0c-b4bc-8a01187556d7,cc508356-e0de-453b-9fed-5972d818b4dd,1c557583-6c11-4320-8257-eb936feef1af)&select=scorecard_id,hole_number,gross_score,net_score,stableford_points,handicap_strokes,stroke_index&order=scorecard_id,hole_number'
$result = Invoke-RestMethod -Uri $url -Headers $h
$result | ConvertTo-Json -Depth 5
