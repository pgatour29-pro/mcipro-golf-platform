$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Content-Type" = "application/json"
}

Write-Host "=== CHECKING PETE PARKS HANDICAPS ===" -ForegroundColor Yellow
Write-Host ""

# Search for Pete Parks in user_profiles
Write-Host "Searching for Pete Parks in user_profiles..." -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?display_name=ilike.*pete*parks*&select=line_user_id,display_name,handicap_index,current_handicap_index"
$peteProfile = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
Write-Host "Found $($peteProfile.Count) matches:" -ForegroundColor White
$peteProfile | ForEach-Object {
    Write-Host "  line_user_id: $($_.line_user_id)" -ForegroundColor Green
    Write-Host "  Name: $($_.display_name)" -ForegroundColor White
    Write-Host "  handicap_index: $($_.handicap_index)" -ForegroundColor White
    Write-Host "  current_handicap_index: $($_.current_handicap_index)" -ForegroundColor White
    Write-Host ""
}

# Get Pete's line_user_id (assuming it's "U2b6d976f19bca4b2f4374ae0e10ed873" from previous files)
$peteId = "U2b6d976f19bca4b2f4374ae0e10ed873"

# Get all society handicaps for Pete
Write-Host "Getting ALL society handicaps for Pete ($peteId)..." -ForegroundColor Cyan
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_handicaps?golfer_id=eq.$peteId&select=society_id,handicap_index,last_calculated_at&order=last_calculated_at.desc"
$peteHandicaps = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
Write-Host "Found $($peteHandicaps.Count) handicap records:" -ForegroundColor White
$peteHandicaps | ForEach-Object {
    $societyName = if ($_.society_id) { $_.society_id } else { "UNIVERSAL (null)" }
    Write-Host "  Society: $societyName" -ForegroundColor Yellow
    Write-Host "  Handicap: $($_.handicap_index)" -ForegroundColor White
    Write-Host "  Last Updated: $($_.last_calculated_at)" -ForegroundColor Gray
    Write-Host ""
}

# Get society names for the IDs
Write-Host "Getting society names..." -ForegroundColor Cyan
$societyIds = $peteHandicaps | Where-Object { $_.society_id } | Select-Object -ExpandProperty society_id -Unique
if ($societyIds) {
    $ids = ($societyIds | ForEach-Object { "'$_'" }) -join ","
    $url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_profiles?id=in.($ids)&select=id,society_name"
    $societies = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
    Write-Host "Society Names:" -ForegroundColor White
    $societies | ForEach-Object {
        Write-Host "  $($_.id) = $($_.society_name)" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Yellow
