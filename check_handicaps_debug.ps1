$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
}

# Pete's known IDs
$peteLineId = "U2b6d976f19bca4b2f4374ae0e10ed873"

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "=== PETE PARK HANDICAP INVESTIGATION ===" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

Write-Host "`n=== 1. USER_PROFILES TABLE ===" -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?line_user_id=eq.$peteLineId&select=name,line_user_id,handicap,profile_data"
try {
    $pete = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
    if ($pete) {
        Write-Host "Name: $($pete.name)"
        Write-Host "TOP-LEVEL 'handicap' column value: '$($pete.handicap)'"
        Write-Host "profile_data.golfInfo.handicap: '$($pete.profile_data.golfInfo.handicap)'"
        Write-Host "profile_data.golfInfo.homeClub: '$($pete.profile_data.golfInfo.homeClub)'"
        Write-Host "`nFull profile_data JSON:"
        $pete.profile_data | ConvertTo-Json -Depth 5
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "`n=== 2. SOCIETY_MEMBERS TABLE ===" -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_members?user_id=eq.$peteLineId&select=society_id,handicap,role"
try {
    $memberships = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
    if ($memberships -and $memberships.Count -gt 0) {
        $memberships | ForEach-Object {
            Write-Host "  Society: $($_.society_id) | Handicap: '$($_.handicap)' | Role: $($_.role)"
        }
    } else {
        Write-Host "  No society memberships found"
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "`n=== 3. RECENT EVENT REGISTRATIONS ===" -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/event_registrations?player_id=eq.$peteLineId&select=event_id,player_name,handicap,created_at&order=created_at.desc&limit=5"
try {
    $regs = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
    if ($regs -and $regs.Count -gt 0) {
        $regs | ForEach-Object {
            Write-Host "  Name: $($_.player_name) | Handicap: '$($_.handicap)' | Date: $($_.created_at)"
        }
    } else {
        Write-Host "  No event registrations found"
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "`n========================================"
Write-Host "=== ALAN THOMAS HANDICAP INVESTIGATION ==="
Write-Host "========================================" -ForegroundColor Yellow

# First find Alan Thomas's line_user_id
Write-Host "`n=== Finding Alan Thomas ===" -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?select=name,line_user_id,handicap,profile_data"
try {
    $allUsers = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
    $alan = $allUsers | Where-Object { $_.name -like "*Alan*Thomas*" -or $_.name -like "*Thomas*Alan*" }
    if ($alan) {
        Write-Host "Found Alan Thomas:"
        Write-Host "  Name: $($alan.name)"
        Write-Host "  line_user_id: $($alan.line_user_id)"
        Write-Host "  TOP-LEVEL 'handicap' column: '$($alan.handicap)'"
        if ($alan.profile_data -and $alan.profile_data.golfInfo) {
            Write-Host "  profile_data.golfInfo.handicap: '$($alan.profile_data.golfInfo.handicap)'"
        } else {
            Write-Host "  profile_data.golfInfo: NOT FOUND or NULL"
        }
        Write-Host "`n  Full profile_data:"
        $alan.profile_data | ConvertTo-Json -Depth 5

        # Check Alan's society memberships
        if ($alan.line_user_id) {
            Write-Host "`n=== Alan's Society Memberships ===" -ForegroundColor Cyan
            $url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_members?user_id=eq.$($alan.line_user_id)&select=society_id,handicap,role"
            $alanMemberships = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
            if ($alanMemberships -and $alanMemberships.Count -gt 0) {
                $alanMemberships | ForEach-Object {
                    Write-Host "  Society: $($_.society_id) | Handicap: '$($_.handicap)' | Role: $($_.role)"
                }
            } else {
                Write-Host "  No society memberships found"
            }

            # Check Alan's recent event registrations
            Write-Host "`n=== Alan's Recent Registrations ===" -ForegroundColor Cyan
            $url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/event_registrations?player_id=eq.$($alan.line_user_id)&select=event_id,player_name,handicap,created_at&order=created_at.desc&limit=5"
            $alanRegs = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
            if ($alanRegs -and $alanRegs.Count -gt 0) {
                $alanRegs | ForEach-Object {
                    Write-Host "  Name: $($_.player_name) | Handicap: '$($_.handicap)' | Date: $($_.created_at)"
                }
            } else {
                Write-Host "  No event registrations found"
            }
        }
    } else {
        Write-Host "  Alan Thomas NOT FOUND in user_profiles"
        # Try searching registrations by name
        Write-Host "`n=== Searching registrations for 'Alan' ===" -ForegroundColor Cyan
        $url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/event_registrations?select=player_id,player_name,handicap&limit=200"
        $allRegs = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
        $alanRegs = $allRegs | Where-Object { $_.player_name -like "*Alan*" }
        if ($alanRegs) {
            $alanRegs | ForEach-Object {
                Write-Host "  player_id: $($_.player_id) | Name: $($_.player_name) | Handicap: '$($_.handicap)'"
            }
        }
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "`n========================================"
Write-Host "=== SUMMARY OF HANDICAP LOCATIONS ===" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "1. user_profiles.handicap - TOP LEVEL COLUMN (should NOT exist/be used)"
Write-Host "2. user_profiles.profile_data.golfInfo.handicap - UNIVERSAL handicap"
Write-Host "3. society_members.handicap - SOCIETY-SPECIFIC handicap"
Write-Host "4. event_registrations.handicap - SNAPSHOT at registration time"
