$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
}

# Check event registrations
$peteIds = "U2b6d976f19bca4b2f4374ae0e10ed873,KAKAO-4643832141"
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/event_registrations?player_id=in.($peteIds)&select=id,event_id,player_id,created_at"
$regs = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
Write-Host "=== EVENT REGISTRATIONS for Pete ===" -ForegroundColor Cyan
$regs | Format-Table -AutoSize
Write-Host "COUNT: $($regs.Count)" -ForegroundColor Yellow

# Check scorecards
Write-Host "`n=== SCORECARDS for Pete ===" -ForegroundColor Cyan
$url2 = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scorecards?player_id=in.($peteIds)&select=id,event_id,player_id,total_gross,total_stableford,created_at"
$cards = Invoke-RestMethod -Uri $url2 -Headers $headers -Method Get
$cards | Format-Table -AutoSize
Write-Host "COUNT: $($cards.Count)" -ForegroundColor Yellow
