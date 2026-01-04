$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Content-Type" = "application/json"
    "Prefer" = "return=minimal"
}

$baseUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/caddy_profiles"

# Pleasant Valley caddies to add (17 more to reach 20)
$pvCaddies = @(
    @{ name = "Somporn Valley"; bio = "Mountain terrain specialist"; photo = 1 },
    @{ name = "Siriporn Vista"; bio = "Nature enthusiast guide"; photo = 2 },
    @{ name = "Thaworn Peak"; bio = "Precision valley expert"; photo = 3 },
    @{ name = "Sirilak Horizon"; bio = "Beginner-friendly support"; photo = 4 },
    @{ name = "Preecha Glen"; bio = "Wind reading specialist"; photo = 5 },
    @{ name = "Pensri Ridge"; bio = "Tournament experienced"; photo = 6 },
    @{ name = "Somsak Crest"; bio = "VIP valley service"; photo = 7 },
    @{ name = "Narong Dell"; bio = "Family golf specialist"; photo = 8 },
    @{ name = "Wipada Brook"; bio = "Scenic tour guide"; photo = 9 },
    @{ name = "Prasert Hollow"; bio = "Course strategy expert"; photo = 10 },
    @{ name = "Siriphan Meadow"; bio = "International guests favorite"; photo = 11 },
    @{ name = "Thanakit Summit"; bio = "Early morning specialist"; photo = 12 },
    @{ name = "Malai Springs"; bio = "Ladies golf expert"; photo = 13 },
    @{ name = "Chaiwat Bluff"; bio = "Corporate outing specialist"; photo = 14 },
    @{ name = "Pornpan Grove"; bio = "Patient with beginners"; photo = 15 },
    @{ name = "Anusorn Canyon"; bio = "Local knowledge expert"; photo = 16 },
    @{ name = "Rattana Terrace"; bio = "Sunset round specialist"; photo = 17 }
)

# Royal Lakeside caddies (20 new)
$rlCaddies = @(
    @{ name = "Chaiwat Lake"; bio = "VIP lakeside specialist"; photo = 18 },
    @{ name = "Thanakit Shore"; bio = "Photography spot guide"; photo = 19 },
    @{ name = "Siriwan Waters"; bio = "Ladies golf expert"; photo = 20 },
    @{ name = "Prasert Bay"; bio = "Course management pro"; photo = 21 },
    @{ name = "Malai Pond"; bio = "Family-friendly service"; photo = 22 },
    @{ name = "Somying Cove"; bio = "Tournament experienced"; photo = 23 },
    @{ name = "Narong Inlet"; bio = "Water hazard expert"; photo = 24 },
    @{ name = "Wipada Lagoon"; bio = "Scenic tour specialist"; photo = 25 },
    @{ name = "Pensri Estuary"; bio = "Ladies lakeside guide"; photo = 1 },
    @{ name = "Somsak Marina"; bio = "Business golfer favorite"; photo = 2 },
    @{ name = "Siriphan Dock"; bio = "International service"; photo = 3 },
    @{ name = "Thaworn Harbor"; bio = "VIP premium service"; photo = 4 },
    @{ name = "Preecha Jetty"; bio = "Early bird specialist"; photo = 5 },
    @{ name = "Anong Reef"; bio = "Wind reading expert"; photo = 6 },
    @{ name = "Rattana Pier"; bio = "Sunset round guide"; photo = 7 },
    @{ name = "Pornpan Isle"; bio = "Patient with beginners"; photo = 8 },
    @{ name = "Chaiyong Sandbar"; bio = "Local knowledge pro"; photo = 9 },
    @{ name = "Kulap Lighthouse"; bio = "Photography guide"; photo = 10 },
    @{ name = "Boonmee Anchor"; bio = "Resort service expert"; photo = 11 },
    @{ name = "Manee Breakwater"; bio = "Strategy specialist"; photo = 12 }
)

Write-Host "=== ADDING PLEASANT VALLEY CADDIES ===" -ForegroundColor Yellow

$count = 0
foreach ($c in $pvCaddies) {
    $body = @{
        name = $c.name
        course_name = "Pleasant Valley Golf & Country Club"
        photo_url = "/images/caddies/caddy$($c.photo).jpg"
        experience_years = (Get-Random -Minimum 3 -Maximum 15)
        languages = @("Thai", "English")
        rating = [math]::Round((Get-Random -Minimum 42 -Maximum 50) / 10, 1)
        is_active = $true
        bio = $c.bio
        availability_status = @("available", "available", "available", "booked")[(Get-Random -Maximum 4)]
    } | ConvertTo-Json

    try {
        Invoke-RestMethod -Uri $baseUrl -Headers $headers -Method Post -Body $body
        Write-Host "Added: $($c.name)" -ForegroundColor Green
        $count++
    } catch {
        Write-Host "FAILED: $($c.name) - $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host "Added $count Pleasant Valley caddies" -ForegroundColor Cyan

Write-Host ""
Write-Host "=== ADDING ROYAL LAKESIDE CADDIES ===" -ForegroundColor Yellow

$count = 0
foreach ($c in $rlCaddies) {
    $body = @{
        name = $c.name
        course_name = "Royal Lakeside Golf Club"
        photo_url = "/images/caddies/caddy$($c.photo).jpg"
        experience_years = (Get-Random -Minimum 3 -Maximum 15)
        languages = @("Thai", "English")
        rating = [math]::Round((Get-Random -Minimum 42 -Maximum 50) / 10, 1)
        is_active = $true
        bio = $c.bio
        availability_status = @("available", "available", "available", "booked")[(Get-Random -Maximum 4)]
    } | ConvertTo-Json

    try {
        Invoke-RestMethod -Uri $baseUrl -Headers $headers -Method Post -Body $body
        Write-Host "Added: $($c.name)" -ForegroundColor Green
        $count++
    } catch {
        Write-Host "FAILED: $($c.name) - $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host "Added $count Royal Lakeside caddies" -ForegroundColor Cyan

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Yellow
