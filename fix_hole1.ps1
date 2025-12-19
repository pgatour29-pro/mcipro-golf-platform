$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}
$base = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1"

# First, get BRC course data to find hole 1 par
Write-Host "=== CHECKING BRC COURSE DATA ===" -ForegroundColor Cyan
$courses = Invoke-RestMethod "$base/courses?select=id,name,holes&name=ilike.*BRC*" -Headers $headers
if ($courses) {
    Write-Host "Found BRC course"
    $holes = $courses[0].holes | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($holes) {
        $hole1 = $holes | Where-Object { $_.hole_number -eq 1 }
        Write-Host "Hole 1: Par $($hole1.par), SI $($hole1.stroke_index)"
    }
}

# Get scorecard details with handicaps
Write-Host "`n=== SCORECARD DETAILS ===" -ForegroundColor Cyan
$eventId = "bdf4c783-73f9-477d-958a-5b2aba80b041"
$scorecards = Invoke-RestMethod "$base/scorecards?select=id,player_id,player_name,handicap,playing_handicap&event_id=eq.$eventId" -Headers $headers
$scorecards | Format-Table -AutoSize

# Get player names mapping
Write-Host "`n=== PLAYER NAMES ===" -ForegroundColor Cyan
$playerIds = $scorecards | ForEach-Object { $_.player_id }
$profiles = Invoke-RestMethod "$base/user_profiles?select=line_user_id,name&line_user_id=in.($($playerIds -join ','))" -Headers $headers
$profiles | Format-Table -AutoSize
