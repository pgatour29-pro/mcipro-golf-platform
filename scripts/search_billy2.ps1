$SUPABASE_URL = "https://pyeeplwsnupmhgbguwqs.supabase.co"
$ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"

$headers = @{
    "apikey" = $ANON_KEY
    "Authorization" = "Bearer $ANON_KEY"
}

Write-Host "=== Searching for Billy Shepley ===" -ForegroundColor Cyan

# Search user_profiles (not profiles)
Write-Host "`n--- User Profiles table (billy or shepley) ---" -ForegroundColor Yellow
try {
    $profilesUrl = "$SUPABASE_URL/rest/v1/user_profiles?or=(name.ilike.*billy*,name.ilike.*shepley*)&select=*"
    $profiles = Invoke-RestMethod -Uri $profilesUrl -Headers $headers -Method Get
    if ($profiles.Count -eq 0) {
        Write-Host "No user_profiles found" -ForegroundColor Red
    } else {
        $profiles | ForEach-Object {
            Write-Host "LINE User ID: $($_.line_user_id)" -ForegroundColor Green
            Write-Host "  Name: $($_.name)"
            Write-Host "  Email: $($_.email)"
            Write-Host "  Role: $($_.role)"
            Write-Host "  Society: $($_.society_name)"
            Write-Host "  Home Club: $($_.home_club)"
            Write-Host "  Created: $($_.created_at)"
            Write-Host ""
        }
    }
} catch {
    Write-Host "Error searching user_profiles: $($_.Exception.Message)" -ForegroundColor Red
}

# Search global_player_directory
Write-Host "`n--- Global Player Directory (billy or shepley) ---" -ForegroundColor Yellow
try {
    $playersUrl = "$SUPABASE_URL/rest/v1/global_player_directory?or=(display_name.ilike.*billy*,display_name.ilike.*shepley*)&select=*"
    $players = Invoke-RestMethod -Uri $playersUrl -Headers $headers -Method Get
    if ($players.Count -eq 0) {
        Write-Host "No global_player_directory found" -ForegroundColor Red
    } else {
        $players | ForEach-Object {
            Write-Host "ID: $($_.id)" -ForegroundColor Green
            Write-Host "  Display Name: $($_.display_name)"
            Write-Host "  Email: $($_.email)"
            Write-Host "  Handicap: $($_.handicap)"
            Write-Host "  Created: $($_.created_at)"
            Write-Host ""
        }
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# List all profiles with 'billy' or 'shepley' anywhere
Write-Host "`n--- All profiles (for reference) ---" -ForegroundColor Yellow
try {
    $allUrl = "$SUPABASE_URL/rest/v1/user_profiles?select=line_user_id,name,role,society_name&limit=100"
    $all = Invoke-RestMethod -Uri $allUrl -Headers $headers -Method Get
    Write-Host "Found $($all.Count) total profiles" -ForegroundColor Cyan
    $all | ForEach-Object {
        if ($_.name -match "billy|shepley|bill" -or $_.line_user_id -match "billy") {
            Write-Host "  * $($_.name) [$($_.role)] - Society: $($_.society_name)" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "Error listing profiles: $($_.Exception.Message)" -ForegroundColor Red
}

# Check society_members
Write-Host "`n--- Society Members (searching by player_name) ---" -ForegroundColor Yellow
try {
    $membersUrl = "$SUPABASE_URL/rest/v1/society_members?or=(player_name.ilike.*billy*,player_name.ilike.*shepley*)&select=*"
    $members = Invoke-RestMethod -Uri $membersUrl -Headers $headers -Method Get
    if ($members.Count -eq 0) {
        Write-Host "No society_members found with that name" -ForegroundColor Red
    } else {
        $members | ForEach-Object {
            Write-Host "Member ID: $($_.id)" -ForegroundColor Green
            Write-Host "  Player Name: $($_.player_name)"
            Write-Host "  Society ID: $($_.society_id)"
            Write-Host "  Golfer ID: $($_.golfer_id)"
            Write-Host "  Global Player ID: $($_.global_player_id)"
            Write-Host ""
        }
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
