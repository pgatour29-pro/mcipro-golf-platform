$SUPABASE_URL = "https://pyeeplwsnupmhgbguwqs.supabase.co"
$ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"

$headers = @{
    "apikey" = $ANON_KEY
    "Authorization" = "Bearer $ANON_KEY"
}

Write-Host "=== Searching for Billy Shepley ===" -ForegroundColor Cyan

# Search profiles
Write-Host "`n--- Profiles table (billy or shepley) ---" -ForegroundColor Yellow
try {
    $profilesUrl = "$SUPABASE_URL/rest/v1/profiles?or=(display_name.ilike.*billy*,display_name.ilike.*shepley*,username.ilike.*billy*,username.ilike.*shepley*)&select=*"
    $profiles = Invoke-RestMethod -Uri $profilesUrl -Headers $headers -Method Get
    if ($profiles.Count -eq 0) {
        Write-Host "No profiles found" -ForegroundColor Red
    } else {
        $profiles | ForEach-Object {
            Write-Host "ID: $($_.id)" -ForegroundColor Green
            Write-Host "  Display Name: $($_.display_name)"
            Write-Host "  Username: $($_.username)"
            Write-Host "  LINE User ID: $($_.line_user_id)"
            Write-Host "  Email: $($_.email)"
            Write-Host "  Created: $($_.created_at)"
            Write-Host ""
        }
    }
} catch {
    Write-Host "Error searching profiles: $_" -ForegroundColor Red
}

# Search global_players
Write-Host "`n--- Global Players table (billy or shepley) ---" -ForegroundColor Yellow
try {
    $playersUrl = "$SUPABASE_URL/rest/v1/global_players?or=(name.ilike.*billy*,name.ilike.*shepley*)&select=*"
    $players = Invoke-RestMethod -Uri $playersUrl -Headers $headers -Method Get
    if ($players.Count -eq 0) {
        Write-Host "No global players found" -ForegroundColor Red
    } else {
        $players | ForEach-Object {
            Write-Host "ID: $($_.id)" -ForegroundColor Green
            Write-Host "  Name: $($_.name)"
            Write-Host "  Email: $($_.email)"
            Write-Host "  LINE User ID: $($_.line_user_id)"
            Write-Host "  Handicap: $($_.handicap)"
            Write-Host "  Created: $($_.created_at)"
            Write-Host ""
        }
    }
} catch {
    Write-Host "Error searching global_players: $_" -ForegroundColor Red
}

# Search society_members
Write-Host "`n--- Society Members (billy or shepley) ---" -ForegroundColor Yellow
try {
    $membersUrl = "$SUPABASE_URL/rest/v1/society_members?or=(player_name.ilike.*billy*,player_name.ilike.*shepley*)&select=*,societies(name)"
    $members = Invoke-RestMethod -Uri $membersUrl -Headers $headers -Method Get
    if ($members.Count -eq 0) {
        Write-Host "No society members found" -ForegroundColor Red
    } else {
        $members | ForEach-Object {
            Write-Host "ID: $($_.id)" -ForegroundColor Green
            Write-Host "  Player Name: $($_.player_name)"
            Write-Host "  Profile ID: $($_.profile_id)"
            Write-Host "  Global Player ID: $($_.global_player_id)"
            Write-Host "  Society: $($_.societies.name)"
            Write-Host ""
        }
    }
} catch {
    Write-Host "Error searching society_members: $_" -ForegroundColor Red
}
