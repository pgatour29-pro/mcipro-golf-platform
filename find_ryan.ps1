$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Content-Type" = "application/json"
}

Write-Host "=== FINDING RYAN ===" -ForegroundColor Yellow
Write-Host ""

# Try different variations
$searches = @(
    "Ryan Thomas",
    "ryan",
    "thomas",
    "Ryan T",
    "R Thomas",
    "RyanThomas"
)

foreach ($name in $searches) {
    Write-Host "Searching for '$name'..." -ForegroundColor Cyan
    $encoded = [uri]::EscapeDataString("*$name*")
    $url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scorecards?player_name=ilike.$encoded&select=player_id,player_name&limit=5"
    try {
        $results = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
        if ($results.Count -gt 0) {
            Write-Host "  Found $($results.Count):" -ForegroundColor Green
            $results | ForEach-Object {
                Write-Host "    ID: $($_.player_id), Name: $($_.player_name)" -ForegroundColor White
            }
        }
    } catch {
        Write-Host "  Error searching" -ForegroundColor Red
    }
}

# Also get all unique MANUAL players from scorecards
Write-Host "`nGetting all MANUAL players..." -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scorecards?player_id=like.MANUAL*&select=player_id,player_name&limit=100"
$manual = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
$unique = $manual | Sort-Object -Property player_id -Unique
Write-Host "Found $($unique.Count) unique MANUAL players:" -ForegroundColor White
$unique | ForEach-Object {
    Write-Host "  $($_.player_name) = $($_.player_id)" -ForegroundColor Gray
}

Write-Host "`n=== DONE ===" -ForegroundColor Yellow
