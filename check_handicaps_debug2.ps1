$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
}

# Pete's known IDs
$peteLineId = "U2b6d976f19bca4b2f4374ae0e10ed873"

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "=== PETE PARK - ALL REGISTRATIONS ===" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

# Get ALL Pete's registrations, sorted by date
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/event_registrations?player_id=eq.$peteLineId&select=event_id,player_name,handicap,created_at&order=created_at.desc"
try {
    $regs = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
    Write-Host "Total registrations: $($regs.Count)"
    Write-Host ""
    Write-Host "Date                   | Handicap | Event ID"
    Write-Host "-----------------------|----------|------------------"
    $regs | ForEach-Object {
        $date = $_.created_at.Substring(0,10)
        Write-Host "$date             | $($_.handicap.ToString().PadRight(8)) | $($_.event_id.Substring(0,8))..."
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "=== ALAN THOMAS - SEARCH BY NAME ===" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

# Search all registrations
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/event_registrations?select=player_id,player_name,handicap,created_at&order=created_at.desc&limit=500"
try {
    $allRegs = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

    # Find Alan
    $alanRegs = $allRegs | Where-Object { $_.player_name -like "*Alan*" }
    Write-Host "Found $($alanRegs.Count) registrations for 'Alan':"
    $alanRegs | ForEach-Object {
        Write-Host "  ID: $($_.player_id) | Name: $($_.player_name) | Handicap: '$($_.handicap)' | Date: $($_.created_at.Substring(0,10))"
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "=== USER_PROFILES (without handicap column) ===" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

# Try querying user_profiles without the handicap column to avoid RLS issue
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?line_user_id=eq.$peteLineId&select=name,line_user_id,profile_data"
try {
    $pete = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
    if ($pete) {
        Write-Host "Pete Park profile_data:"
        Write-Host ($pete.profile_data | ConvertTo-Json -Depth 5)
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "=== SOCIETY_MEMBERS (Pete) ===" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

# Try society_members without specifying columns
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_members?user_id=eq.$peteLineId"
try {
    $memberships = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
    if ($memberships -and $memberships.Count -gt 0) {
        $memberships | ForEach-Object {
            Write-Host "Society ID: $($_.society_id)"
            Write-Host "  Handicap: '$($_.handicap)'"
            Write-Host "  Role: $($_.role)"
            Write-Host "  Created: $($_.created_at)"
            Write-Host ""
        }
    } else {
        Write-Host "No memberships found"
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
