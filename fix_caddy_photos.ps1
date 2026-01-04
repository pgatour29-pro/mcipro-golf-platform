$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Content-Type" = "application/json"
    "Prefer" = "return=minimal"
}

$baseUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/caddy_profiles"

# Get all caddies
$url = "$baseUrl" + "?select=id,name,course_name,photo_url"
$allCaddies = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

# Filter caddies with null or empty photo_url
$noPhotoCaddies = $allCaddies | Where-Object { -not $_.photo_url -or $_.photo_url -eq "" }

Write-Host "=== FIXING MISSING CADDY PHOTOS ===" -ForegroundColor Yellow
Write-Host "Total caddies: $($allCaddies.Count)" -ForegroundColor Cyan
Write-Host "Caddies without photos: $($noPhotoCaddies.Count)" -ForegroundColor Cyan
Write-Host ""

$photoIndex = 1
foreach ($c in $noPhotoCaddies) {
    $photoUrl = "/images/caddies/caddy$photoIndex.jpg"
    if ($photoIndex -gt 25) { $photoIndex = 1 }

    $body = @{ photo_url = $photoUrl } | ConvertTo-Json
    $updateUrl = "$baseUrl" + "?id=eq.$($c.id)"

    try {
        Invoke-RestMethod -Uri $updateUrl -Headers $headers -Method Patch -Body $body
        Write-Host "Updated: $($c.name) -> $photoUrl" -ForegroundColor Green
    } catch {
        Write-Host "FAILED: $($c.name) - $($_.Exception.Message)" -ForegroundColor Red
    }

    $photoIndex++
}

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Yellow
