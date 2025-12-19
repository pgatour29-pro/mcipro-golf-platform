$apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
$h = @{
    'apikey' = $apiKey
    'Authorization' = "Bearer $apiKey"
    'Content-Type' = 'application/json'
    'Prefer' = 'return=representation'
}

function Get-PlayerName($golferId) {
    $profileUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?line_user_id=eq.$golferId&select=display_name"
    $profile = Invoke-RestMethod -Uri $profileUrl -Headers $h
    return if ($profile.display_name) { $profile.display_name } else { $golferId }
}

function Get-VerifiedRounds($golferId) {
    # Get scorecards with valid society event UUIDs
    $scUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scorecards?player_id=eq.$golferId&select=id,player_name,total_gross,created_at,event_id&total_gross=gte.60&order=created_at.desc"
    $scorecards = Invoke-RestMethod -Uri $scUrl -Headers $h

    $verifiedRounds = @{}
    foreach ($sc in $scorecards) {
        $isUuid = $sc.event_id -match '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        if ($isUuid) {
            $dateKey = [DateTime]::Parse($sc.created_at).ToString('yyyy-MM-dd')

            # Get stableford
            $scoresUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scores?scorecard_id=eq.$($sc.id)&select=stableford_points"
            $scores = Invoke-RestMethod -Uri $scoresUrl -Headers $h
            $totalStableford = ($scores | Measure-Object -Property stableford_points -Sum).Sum

            # Get course name from event
            $eventUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_events?id=eq.$($sc.event_id)&select=course_name"
            $event = Invoke-RestMethod -Uri $eventUrl -Headers $h
            $courseName = if ($event.course_name) { $event.course_name } else { 'Society Event' }

            # Only keep first (most recent) scorecard per date
            if (-not $verifiedRounds.ContainsKey($dateKey)) {
                $verifiedRounds[$dateKey] = @{
                    gross = $sc.total_gross
                    stableford = $totalStableford
                    played_at = $sc.created_at
                    course_name = $courseName
                }
            }
        }
    }
    return $verifiedRounds
}

function Fix-PlayerRounds($golferId) {
    $playerName = Get-PlayerName $golferId

    Write-Host ""
    Write-Host "=========================================="
    Write-Host "Fixing: $playerName ($golferId)"
    Write-Host "=========================================="

    # Get current rounds
    $roundsUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?golfer_id=eq.$golferId&select=id,course_name,total_gross,total_stableford,played_at&order=played_at.desc"
    $currentRounds = Invoke-RestMethod -Uri $roundsUrl -Headers $h
    Write-Host "Current rounds: $($currentRounds.Count)"

    # Get verified rounds
    $verifiedRounds = Get-VerifiedRounds $golferId
    Write-Host "Verified unique rounds: $($verifiedRounds.Count)"

    if ($verifiedRounds.Count -eq 0) {
        Write-Host "No verified rounds found - skipping"
        return
    }

    # Delete all rounds
    Write-Host "Deleting existing rounds..."
    $deleteUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?golfer_id=eq.$golferId"
    $deleteHeaders = @{
        'apikey' = $apiKey
        'Authorization' = "Bearer $apiKey"
    }
    Invoke-RestMethod -Uri $deleteUrl -Method Delete -Headers $deleteHeaders

    # Insert verified rounds
    Write-Host "Inserting verified rounds..."
    $insertData = @()
    foreach ($key in $verifiedRounds.Keys) {
        $r = $verifiedRounds[$key]
        $insertData += @{
            golfer_id = $golferId
            course_name = $r.course_name
            total_gross = $r.gross
            total_stableford = $r.stableford
            type = 'society'
            played_at = $r.played_at
        }
    }

    $insertUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds"
    $body = $insertData | ConvertTo-Json
    if ($insertData.Count -eq 1) {
        $body = "[$body]"
    }
    Invoke-RestMethod -Uri $insertUrl -Method Post -Headers $h -Body $body | Out-Null

    # Verify
    $finalRounds = Invoke-RestMethod -Uri $roundsUrl -Headers $h
    Write-Host "Final rounds: $($finalRounds.Count)"
    foreach ($r in $finalRounds) {
        $date = [DateTime]::Parse($r.played_at).ToString('MMM dd')
        Write-Host "  $date | $($r.course_name) | Gross: $($r.total_gross) | Pts: $($r.total_stableford)"
    }
}

# Fix the 3 players with duplicates
$playersToFix = @(
    'U044fd835263fc6c0c596cf1d6c2414af',
    'U533f2301ff76d319e0086e8340e4051c',
    'U9e64d5456b0582e81743c87fa48c21e2'
)

foreach ($playerId in $playersToFix) {
    Fix-PlayerRounds $playerId
}

Write-Host ""
Write-Host "=========================================="
Write-Host "ALL DUPLICATES FIXED!"
Write-Host "=========================================="
