$SUPABASE_URL = "https://pyeeplwsnupmhgbguwqs.supabase.co"
$ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"

$headers = @{
    "apikey" = $ANON_KEY
    "Authorization" = "Bearer $ANON_KEY"
}

Write-Host "=== Billy Shepley Profile Details ===" -ForegroundColor Cyan

# Get Billy Shepley's full profile
try {
    $url = "$SUPABASE_URL/rest/v1/user_profiles?name=eq.Billy%20Shepley&select=*"
    $profile = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

    if ($profile) {
        Write-Host "`nFOUND PROFILE:" -ForegroundColor Green
        Write-Host "  LINE User ID: $($profile.line_user_id)" -ForegroundColor Yellow
        Write-Host "  Name: $($profile.name)"
        Write-Host "  Role: $($profile.role)"
        Write-Host "  Email: $($profile.email)"
        Write-Host "  Phone: $($profile.phone)"
        Write-Host "  Society ID: $($profile.society_id)"
        Write-Host "  Society Name: $($profile.society_name)"
        Write-Host "  Home Club: $($profile.home_club)"
        Write-Host "  Home Course Name: $($profile.home_course_name)"
        Write-Host "  Created At: $($profile.created_at)"
        Write-Host "  Updated At: $($profile.updated_at)"
        Write-Host "`n  Profile Data:" -ForegroundColor Cyan
        Write-Host "  $($profile.profile_data | ConvertTo-Json -Depth 5)"
    } else {
        Write-Host "No profile found for Billy Shepley" -ForegroundColor Red
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Check if there are any OTHER profiles with 'Billy Shepley' name (case insensitive)
Write-Host "`n=== All Profiles with 'Shepley' ===" -ForegroundColor Cyan
try {
    $url = "$SUPABASE_URL/rest/v1/user_profiles?name=ilike.*shepley*&select=line_user_id,name,society_name,created_at"
    $profiles = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

    if ($profiles.Count -eq 0) {
        Write-Host "No profiles found" -ForegroundColor Red
    } else {
        $profiles | ForEach-Object {
            Write-Host "  LINE ID: $($_.line_user_id)"
            Write-Host "  Name: $($_.name)"
            Write-Host "  Society: $($_.society_name)"
            Write-Host "  Created: $($_.created_at)"
            Write-Host ""
        }
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Check any rounds or scorecards for Billy
Write-Host "`n=== Recent Activity for Billy ===" -ForegroundColor Cyan
try {
    $url = "$SUPABASE_URL/rest/v1/rounds?golfer_id=eq.U8e1e7241961a2747032dece7929adbde&select=id,round_date,course_name,status&limit=5&order=round_date.desc"
    $rounds = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

    if ($rounds.Count -eq 0) {
        Write-Host "No rounds found" -ForegroundColor Yellow
    } else {
        Write-Host "Found $($rounds.Count) rounds:" -ForegroundColor Green
        $rounds | ForEach-Object {
            Write-Host "  $($_.round_date): $($_.course_name) [$($_.status)]"
        }
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
