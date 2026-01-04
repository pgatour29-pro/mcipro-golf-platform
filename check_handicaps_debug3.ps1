$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
}

$alanLineId = "U214f2fe47e1681fbb26f0aba95930d64"
$peteLineId = "U2b6d976f19bca4b2f4374ae0e10ed873"

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "=== ALAN THOMAS PROFILE ===" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?line_user_id=eq.$alanLineId&select=name,line_user_id,profile_data"
try {
    $alan = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
    if ($alan) {
        Write-Host "Name: $($alan.name)"
        Write-Host "LINE ID: $($alan.line_user_id)"
        Write-Host ""
        Write-Host "Full profile_data:"
        Write-Host ($alan.profile_data | ConvertTo-Json -Depth 5)
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "=== ALL SOCIETY_MEMBERS TABLE ===" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

# Get all society members
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_members?select=user_id,society_id,handicap,role"
try {
    $allMembers = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

    Write-Host "Total members in society_members: $($allMembers.Count)"

    # Find Pete
    $peteMember = $allMembers | Where-Object { $_.user_id -eq $peteLineId }
    Write-Host "`nPete Park memberships:"
    if ($peteMember) {
        $peteMember | ForEach-Object {
            Write-Host "  Society: $($_.society_id) | Handicap: '$($_.handicap)' | Role: $($_.role)"
        }
    } else {
        Write-Host "  NOT FOUND in society_members"
    }

    # Find Alan
    $alanMember = $allMembers | Where-Object { $_.user_id -eq $alanLineId }
    Write-Host "`nAlan Thomas memberships:"
    if ($alanMember) {
        $alanMember | ForEach-Object {
            Write-Host "  Society: $($_.society_id) | Handicap: '$($_.handicap)' | Role: $($_.role)"
        }
    } else {
        Write-Host "  NOT FOUND in society_members"
    }

} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "=== ANALYSIS SUMMARY ===" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "PETE PARK:"
Write-Host "  - Profile handicap: 5.0"
Write-Host "  - Registration handicaps vary wildly: 9.9, 3.2, 2.5, 2.8, 5, 4, 3.8, 3.9"
Write-Host "  - TODAY (Dec 29) registered with 9.9 but profile says 5.0!"
Write-Host ""
Write-Host "ALAN THOMAS:"
Write-Host "  - Registration handicaps: 11, 11.2, 12.2"
Write-Host "  - Need to check profile_data.golfInfo.handicap"
