$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

$peteId = "U2b6d976f19bca4b2f4374ae0e10ed873"
$alanId = "U214f2fe47e1681fbb26f0aba95930d64"
$trggId = "7c0e4b72-d925-44bc-afda-38259a7ba346"

Write-Host "=== FIXING HANDICAPS ===" -ForegroundColor Yellow

# Pete Park - Universal 3.6
Write-Host "Updating Pete Park Universal to 3.6..." -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_handicaps?golfer_id=eq.$peteId&society_id=is.null"
$body = @{
    handicap_index = 3.6
    calculation_method = "MANUAL"
    last_calculated_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
} | ConvertTo-Json
try {
    $result = Invoke-RestMethod -Uri $url -Headers $headers -Method Patch -Body $body
    Write-Host "  Done" -ForegroundColor Green
} catch {
    Write-Host "  Error: $_" -ForegroundColor Red
}

# Pete Park - TRGG 2.5
Write-Host "Updating Pete Park TRGG to 2.5..." -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_handicaps?golfer_id=eq.$peteId&society_id=eq.$trggId"
$body = @{
    handicap_index = 2.5
    calculation_method = "MANUAL"
    last_calculated_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
} | ConvertTo-Json
try {
    $result = Invoke-RestMethod -Uri $url -Headers $headers -Method Patch -Body $body
    Write-Host "  Done" -ForegroundColor Green
} catch {
    Write-Host "  Error: $_" -ForegroundColor Red
}

# Alan Thomas - Universal 11.1
Write-Host "Updating Alan Thomas Universal to 11.1..." -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_handicaps?golfer_id=eq.$alanId&society_id=is.null"
$body = @{
    handicap_index = 11.1
    calculation_method = "MANUAL"
    last_calculated_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
} | ConvertTo-Json
try {
    $result = Invoke-RestMethod -Uri $url -Headers $headers -Method Patch -Body $body
    Write-Host "  Done" -ForegroundColor Green
} catch {
    Write-Host "  Error: $_" -ForegroundColor Red
}

# Alan Thomas - TRGG 10.9
Write-Host "Updating Alan Thomas TRGG to 10.9..." -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_handicaps?golfer_id=eq.$alanId&society_id=eq.$trggId"
$body = @{
    handicap_index = 10.9
    calculation_method = "MANUAL"
    last_calculated_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
} | ConvertTo-Json
try {
    $result = Invoke-RestMethod -Uri $url -Headers $headers -Method Patch -Body $body
    Write-Host "  Done" -ForegroundColor Green
} catch {
    Write-Host "  Error: $_" -ForegroundColor Red
}

# Also update Pete's profile_data
Write-Host ""
Write-Host "Updating Pete's profile_data.golfInfo.handicap to 3.6..." -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?line_user_id=eq.$peteId&select=profile_data"
$profile = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

if ($profile -and $profile.profile_data) {
    $profileData = $profile.profile_data
    $profileData.handicap = "3.6"
    $profileData.golfInfo.handicap = "3.6"
    $profileData.golfInfo.lastHandicapUpdate = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

    $updateUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?line_user_id=eq.$peteId"
    $updateBody = @{ profile_data = $profileData } | ConvertTo-Json -Depth 10
    try {
        Invoke-RestMethod -Uri $updateUrl -Headers $headers -Method Patch -Body $updateBody
        Write-Host "  Done" -ForegroundColor Green
    } catch {
        Write-Host "  Error: $_" -ForegroundColor Red
    }
}

# Also update Alan's profile_data
Write-Host "Updating Alan's profile_data.golfInfo.handicap to 11.1..." -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?line_user_id=eq.$alanId&select=profile_data"
$profile = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

if ($profile -and $profile.profile_data) {
    $profileData = $profile.profile_data
    $profileData.handicap = "11.1"
    $profileData.golfInfo.handicap = "11.1"
    $profileData.golfInfo.lastHandicapUpdate = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

    $updateUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?line_user_id=eq.$alanId"
    $updateBody = @{ profile_data = $profileData } | ConvertTo-Json -Depth 10
    try {
        Invoke-RestMethod -Uri $updateUrl -Headers $headers -Method Patch -Body $updateBody
        Write-Host "  Done" -ForegroundColor Green
    } catch {
        Write-Host "  Error: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== VERIFYING ===" -ForegroundColor Yellow

# Verify Pete
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_handicaps?golfer_id=eq.$peteId&select=society_id,handicap_index"
$peteHcps = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
Write-Host "Pete Park:"
$peteHcps | ForEach-Object {
    $label = if ($_.society_id) { "TRGG" } else { "Universal" }
    Write-Host "  $label : $($_.handicap_index)"
}

# Verify Alan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_handicaps?golfer_id=eq.$alanId&select=society_id,handicap_index"
$alanHcps = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
Write-Host "Alan Thomas:"
$alanHcps | ForEach-Object {
    $label = if ($_.society_id) { "TRGG" } else { "Universal" }
    Write-Host "  $label : $($_.handicap_index)"
}
