$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
}

# Get Pete's registrations and group by event_id
$peteId = "U2b6d976f19bca4b2f4374ae0e10ed873"
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/event_registrations?player_id=eq.$peteId&select=event_id"
$regs = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

# Find duplicates
$grouped = $regs | Group-Object -Property event_id
$duplicates = $grouped | Where-Object { $_.Count -gt 1 }

if ($duplicates) {
    Write-Host "=== DUPLICATE REGISTRATIONS ===" -ForegroundColor Red
    $duplicates | ForEach-Object {
        Write-Host "Event $($_.Name): $($_.Count) registrations" -ForegroundColor Yellow
    }
} else {
    Write-Host "No duplicate registrations found for Pete" -ForegroundColor Green
}

# Also check for duplicate rounds for same event
Write-Host "`n=== Checking duplicate ROUNDS per event ===" -ForegroundColor Cyan
$url2 = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?golfer_id=eq.$peteId&select=id,society_event_id,played_at,total_stableford"
$rounds = Invoke-RestMethod -Uri $url2 -Headers $headers -Method Get
$grouped2 = $rounds | Where-Object { $_.society_event_id } | Group-Object -Property society_event_id
$dupRounds = $grouped2 | Where-Object { $_.Count -gt 1 }

if ($dupRounds) {
    Write-Host "=== DUPLICATE ROUNDS FOR SAME EVENT ===" -ForegroundColor Red
    $dupRounds | ForEach-Object {
        Write-Host "Event $($_.Name): $($_.Count) rounds" -ForegroundColor Yellow
        $_.Group | Format-Table id, played_at, total_stableford -AutoSize
    }
} else {
    Write-Host "No duplicate rounds for same event" -ForegroundColor Green
}
