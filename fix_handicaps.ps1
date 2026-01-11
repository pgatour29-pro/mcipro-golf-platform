# CORRECT Supabase URL: pyeeplwsnupmhgbguwqs.supabase.co
# DO NOT USE: bptodqfwmnbmprqqyrcc.supabase.co (OLD/WRONG)

$apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
$baseUrl = 'https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1'

$h = @{
    'apikey' = $apiKey
    'Authorization' = "Bearer $apiKey"
    'Content-Type' = 'application/json'
    'Prefer' = 'return=representation'
}

$peteId = "U2b6d976f19bca4b2f4374ae0e10ed873"

# Find Tristan
Write-Host "Finding Tristan..."
$searchUrl = "$baseUrl/user_profiles?name=ilike.*tristan*&select=line_user_id,name"
$profiles = Invoke-RestMethod -Uri $searchUrl -Headers $h
$tristanId = $null
foreach ($p in $profiles) {
    Write-Host "Found: $($p.name) - $($p.line_user_id)"
    $tristanId = $p.line_user_id
}

if (-not $tristanId) {
    Write-Host "ERROR: Could not find Tristan"
    exit 1
}

Write-Host ""
Write-Host "Pete ID: $peteId"
Write-Host "Tristan ID: $tristanId"
Write-Host ""

# Fix Pete's universal handicap to 3.2
Write-Host "Fixing Pete's universal handicap to 3.2..."
$url = "$baseUrl/society_handicaps?golfer_id=eq.$peteId&society_id=is.null"
$body = @{
    handicap_index = 3.2
    calculation_method = "MANUAL"
    last_calculated_at = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json
Invoke-RestMethod -Uri $url -Method Patch -Headers $h -Body $body
Write-Host "Pete: Universal handicap set to 3.2"

# Fix Tristan's universal handicap to 13.2
Write-Host "Fixing Tristan's universal handicap to 13.2..."
$url = "$baseUrl/society_handicaps?golfer_id=eq.$tristanId&society_id=is.null"
$body = @{
    handicap_index = 13.2
    calculation_method = "MANUAL"
    last_calculated_at = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json
Invoke-RestMethod -Uri $url -Method Patch -Headers $h -Body $body
Write-Host "Tristan: Universal handicap set to 13.2"

# Update profile_data for Pete
Write-Host ""
Write-Host "Updating Pete's profile data..."
$url = "$baseUrl/user_profiles?line_user_id=eq.$peteId&select=profile_data"
$peteProfile = Invoke-RestMethod -Uri $url -Headers $h
if ($peteProfile) {
    $profileData = $peteProfile[0].profile_data
    if ($profileData.golfInfo) {
        $profileData.golfInfo.handicap = "3.2"
    }
    $profileData.handicap = "3.2"
    $updateUrl = "$baseUrl/user_profiles?line_user_id=eq.$peteId"
    $updateBody = @{
        handicap_index = 3.2
        profile_data = $profileData
    } | ConvertTo-Json -Depth 10
    Invoke-RestMethod -Uri $updateUrl -Method Patch -Headers $h -Body $updateBody
    Write-Host "Pete: Profile updated to 3.2"
}

# Update profile_data for Tristan
Write-Host "Updating Tristan's profile data..."
$url = "$baseUrl/user_profiles?line_user_id=eq.$tristanId&select=profile_data"
$tristanProfile = Invoke-RestMethod -Uri $url -Headers $h
if ($tristanProfile) {
    $profileData = $tristanProfile[0].profile_data
    if ($profileData.golfInfo) {
        $profileData.golfInfo.handicap = "13.2"
    }
    $profileData.handicap = "13.2"
    $updateUrl = "$baseUrl/user_profiles?line_user_id=eq.$tristanId"
    $updateBody = @{
        handicap_index = 13.2
        profile_data = $profileData
    } | ConvertTo-Json -Depth 10
    Invoke-RestMethod -Uri $updateUrl -Method Patch -Headers $h -Body $updateBody
    Write-Host "Tristan: Profile updated to 13.2"
}

Write-Host ""
Write-Host "DONE! Handicaps fixed."
