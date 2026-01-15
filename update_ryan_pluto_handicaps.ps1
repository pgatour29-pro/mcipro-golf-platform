$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

Write-Host "=== UPDATING RYAN THOMAS AND PLUTO HANDICAPS ===" -ForegroundColor Yellow
Write-Host ""

$ryanId = "TRGG-GUEST-1002"
$plutoId = "MANUAL-1768008205248-jvtubbk"
$trggId = "7c0e4b72-d925-44bc-afda-38259a7ba346"

# Check current TRGG society handicaps
Write-Host "Checking Ryan Thomas current handicap..." -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_handicaps?society_id=eq.$trggId&golfer_id=eq.$ryanId&select=*"
$ryanCurrent = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
if ($ryanCurrent.Count -gt 0) {
    Write-Host "  Current: $($ryanCurrent[0].handicap_index)" -ForegroundColor White
} else {
    Write-Host "  No existing handicap record" -ForegroundColor Yellow
}

Write-Host "Checking Pluto current handicap..." -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_handicaps?society_id=eq.$trggId&golfer_id=eq.$plutoId&select=*"
$plutoCurrent = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
if ($plutoCurrent.Count -gt 0) {
    Write-Host "  Current: $($plutoCurrent[0].handicap_index)" -ForegroundColor White
} else {
    Write-Host "  No existing handicap record" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Updating to +1.6 handicap (-1.6 in database)..." -ForegroundColor Cyan

# Update Ryan Thomas
Write-Host "Updating Ryan Thomas..." -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_handicaps?society_id=eq.$trggId&golfer_id=eq.$ryanId"
$body = @{
    handicap_index = -1.6
    last_updated = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
} | ConvertTo-Json

try {
    if ($ryanCurrent.Count -gt 0) {
        # Update existing record
        $result = Invoke-RestMethod -Uri $url -Headers $headers -Method PATCH -Body $body
        Write-Host "  ✅ Ryan Thomas updated to +1.6" -ForegroundColor Green
    } else {
        # Insert new record
        $url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_handicaps"
        $body = @{
            society_id = $trggId
            golfer_id = $ryanId
            handicap_index = -1.6
            last_updated = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        } | ConvertTo-Json
        $result = Invoke-RestMethod -Uri $url -Headers $headers -Method POST -Body $body
        Write-Host "  ✅ Ryan Thomas created with +1.6" -ForegroundColor Green
    }
} catch {
    Write-Host "  ❌ Failed: $_" -ForegroundColor Red
}

# Update Pluto
Write-Host "Updating Pluto..." -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_handicaps?society_id=eq.$trggId&golfer_id=eq.$plutoId"
$body = @{
    handicap_index = -1.6
    last_updated = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
} | ConvertTo-Json

try {
    if ($plutoCurrent.Count -gt 0) {
        # Update existing record
        $result = Invoke-RestMethod -Uri $url -Headers $headers -Method PATCH -Body $body
        Write-Host "  ✅ Pluto updated to +1.6" -ForegroundColor Green
    } else {
        # Insert new record
        $url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_handicaps"
        $body = @{
            society_id = $trggId
            golfer_id = $plutoId
            handicap_index = -1.6
            last_updated = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        } | ConvertTo-Json
        $result = Invoke-RestMethod -Uri $url -Headers $headers -Method POST -Body $body
        Write-Host "  ✅ Pluto created with +1.6" -ForegroundColor Green
    }
} catch {
    Write-Host "  ❌ Failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== VERIFYING UPDATES ===" -ForegroundColor Yellow

# Verify Ryan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_handicaps?society_id=eq.$trggId&golfer_id=eq.$ryanId&select=*"
$verify = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
Write-Host "Ryan Thomas (TRGG-GUEST-1002):" -ForegroundColor Cyan
Write-Host "  Handicap Index: $($verify[0].handicap_index) (displays as +1.6)" -ForegroundColor White

# Verify Pluto
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_handicaps?society_id=eq.$trggId&golfer_id=eq.$plutoId&select=*"
$verify = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
Write-Host "Pluto (MANUAL-1768008205248-jvtubbk):" -ForegroundColor Cyan
Write-Host "  Handicap Index: $($verify[0].handicap_index) (displays as +1.6)" -ForegroundColor White

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Yellow
Write-Host "Check the My Golf Buddies directory to confirm the handicaps show as +1.6" -ForegroundColor Cyan
