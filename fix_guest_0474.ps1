$apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
$h = @{
    'apikey' = $apiKey
    'Authorization' = "Bearer $apiKey"
    'Content-Type' = 'application/json'
}

$guestId = 'TRGG-GUEST-0474'

# Get guest profile name
Write-Host "Checking guest profile..."
$profileUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?line_user_id=eq.$guestId&select=display_name"
$profile = Invoke-RestMethod -Uri $profileUrl -Headers $h
Write-Host "Guest: $($profile.display_name) ($guestId)"

# Get current rounds
Write-Host ""
Write-Host "Current rounds:"
$roundsUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?golfer_id=eq.$guestId&select=id,course_name,total_gross,total_stableford,played_at&order=played_at.desc"
$rounds = Invoke-RestMethod -Uri $roundsUrl -Headers $h

foreach ($r in $rounds) {
    $date = if ($r.played_at) { [DateTime]::Parse($r.played_at).ToString('MMM dd HH:mm') } else { 'N/A' }
    Write-Host "  $date | $($r.course_name) | Gross: $($r.total_gross) | Pts: $($r.total_stableford) | ID: $($r.id)"
}

# Get verified scorecards with society events
Write-Host ""
Write-Host "Verified scorecards (society events):"
$scUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scorecards?player_id=eq.$guestId&select=id,player_name,total_gross,created_at,event_id&total_gross=gte.60&order=created_at.desc"
$scorecards = Invoke-RestMethod -Uri $scUrl -Headers $h

$validScorecards = @()
foreach ($sc in $scorecards) {
    $isUuid = $sc.event_id -match '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    if ($isUuid) {
        $date = [DateTime]::Parse($sc.created_at).ToString('MMM dd HH:mm')

        # Get stableford
        $scoresUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scores?scorecard_id=eq.$($sc.id)&select=stableford_points"
        $scores = Invoke-RestMethod -Uri $scoresUrl -Headers $h
        $totalStableford = ($scores | Measure-Object -Property stableford_points -Sum).Sum

        Write-Host "  $date | Gross: $($sc.total_gross) | Stableford: $totalStableford | Event: $($sc.event_id)"

        $validScorecards += @{
            gross = $sc.total_gross
            stableford = $totalStableford
            played_at = $sc.created_at
            event_id = $sc.event_id
        }
    }
}

# Find duplicates by date
$uniqueDates = $validScorecards | ForEach-Object {
    [DateTime]::Parse($_.played_at).ToString('yyyy-MM-dd')
} | Select-Object -Unique

Write-Host ""
Write-Host "Unique event dates: $($uniqueDates.Count)"
Write-Host "Total scorecards: $($validScorecards.Count)"

if ($validScorecards.Count -gt $uniqueDates.Count) {
    Write-Host "DUPLICATES DETECTED - will keep first scorecard per date"
}

# Delete all rounds and insert only one per unique date
Write-Host ""
Write-Host "Deleting duplicate rounds..."
$deleteUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?golfer_id=eq.$guestId"
$deleteHeaders = @{
    'apikey' = $apiKey
    'Authorization' = "Bearer $apiKey"
}
Invoke-RestMethod -Uri $deleteUrl -Method Delete -Headers $deleteHeaders
Write-Host "Deleted all rounds for $guestId"

# Get unique scorecards (one per date)
$uniqueRounds = @{}
foreach ($sc in $validScorecards) {
    $dateKey = [DateTime]::Parse($sc.played_at).ToString('yyyy-MM-dd')
    if (-not $uniqueRounds.ContainsKey($dateKey)) {
        $uniqueRounds[$dateKey] = $sc
    }
}

# Insert unique rounds
Write-Host ""
Write-Host "Inserting $($uniqueRounds.Count) unique rounds..."

$insertData = @()
foreach ($key in $uniqueRounds.Keys) {
    $sc = $uniqueRounds[$key]
    $insertData += @{
        golfer_id = $guestId
        course_name = 'Society Event'
        total_gross = $sc.gross
        total_stableford = $sc.stableford
        type = 'society'
        played_at = $sc.played_at
    }
}

if ($insertData.Count -gt 0) {
    $insertUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds"
    $h['Prefer'] = 'return=representation'
    $body = $insertData | ConvertTo-Json
    Invoke-RestMethod -Uri $insertUrl -Method Post -Headers $h -Body $body
    Write-Host "Inserted $($insertData.Count) rounds"
}

# Verify
Write-Host ""
Write-Host "Final rounds:"
$finalRounds = Invoke-RestMethod -Uri $roundsUrl -Headers $h
foreach ($r in $finalRounds) {
    $date = if ($r.played_at) { [DateTime]::Parse($r.played_at).ToString('MMM dd') } else { 'N/A' }
    Write-Host "  $date | $($r.course_name) | Gross: $($r.total_gross) | Pts: $($r.total_stableford)"
}
Write-Host ""
Write-Host "Total: $($finalRounds.Count) rounds"
