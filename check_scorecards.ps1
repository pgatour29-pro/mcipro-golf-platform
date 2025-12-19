$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
}

# Get today's date
$today = (Get-Date).ToString("yyyy-MM-dd")

# Find today's events
Write-Host "=== TODAY'S EVENTS ($today) ===" -ForegroundColor Cyan
$eventsUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_events?event_date=eq.$today&select=id,title"
$events = Invoke-RestMethod -Uri $eventsUrl -Headers $headers -Method Get
$events | Format-Table -AutoSize

if ($events.Count -gt 0) {
    foreach ($event in $events) {
        Write-Host "`n=== SCORECARDS for event: $($event.title) ===" -ForegroundColor Yellow
        $scUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scorecards?event_id=eq.$($event.id)&select=id,player_id,created_at"
        $scorecards = Invoke-RestMethod -Uri $scUrl -Headers $headers -Method Get
        $scorecards | Format-Table -AutoSize
        Write-Host "Total scorecards: $($scorecards.Count)" -ForegroundColor Green
        
        # Check for duplicate player_ids
        $grouped = $scorecards | Group-Object -Property player_id
        $dups = $grouped | Where-Object { $_.Count -gt 1 }
        if ($dups) {
            Write-Host "DUPLICATE PLAYERS FOUND:" -ForegroundColor Red
            $dups | ForEach-Object { Write-Host "  Player $($_.Name): $($_.Count) scorecards" }
        }
    }
}
