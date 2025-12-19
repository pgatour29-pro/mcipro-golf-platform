$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
}

# Check rounds for both Pete IDs
$peteIds = "U2b6d976f19bca4b2f4374ae0e10ed873,KAKAO-4643832141"
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?golfer_id=in.($peteIds)&select=id,golfer_id,society_event_id,played_at,total_gross,total_stableford,status&order=played_at.desc&limit=20"
$rounds = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
Write-Host "=== ROUNDS for Pete ===" -ForegroundColor Cyan
$rounds | Format-Table -AutoSize

Write-Host "`n=== COUNT: $($rounds.Count) rounds ===" -ForegroundColor Yellow
