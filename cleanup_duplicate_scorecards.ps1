$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Content-Type" = "application/json"
    "Prefer" = "return=minimal"
}

$eventId = "33e609fc-a418-4e93-b539-ff85f2919cc3"

# Get all scorecards for this event
$scUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scorecards?event_id=eq.$eventId&select=id,player_id,created_at&order=created_at.desc"
$scorecards = Invoke-RestMethod -Uri $scUrl -Headers $headers -Method Get

# Group by player_id
$grouped = $scorecards | Group-Object -Property player_id

foreach ($group in $grouped) {
    if ($group.Count -gt 1) {
        Write-Host "Player $($group.Name) has $($group.Count) scorecards" -ForegroundColor Yellow
        # Keep the first one (most recent), delete the rest
        $toKeep = $group.Group[0]
        $toDelete = $group.Group | Select-Object -Skip 1
        
        Write-Host "  Keeping: $($toKeep.id) (created: $($toKeep.created_at))" -ForegroundColor Green
        
        foreach ($sc in $toDelete) {
            Write-Host "  Deleting: $($sc.id) (created: $($sc.created_at))" -ForegroundColor Red
            $deleteUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scorecards?id=eq.$($sc.id)"
            try {
                Invoke-RestMethod -Uri $deleteUrl -Headers $headers -Method Delete
                Write-Host "    Deleted successfully" -ForegroundColor Gray
            } catch {
                Write-Host "    Failed to delete: $_" -ForegroundColor Red
            }
        }
    }
}

Write-Host "`n=== CLEANUP COMPLETE ===" -ForegroundColor Cyan
