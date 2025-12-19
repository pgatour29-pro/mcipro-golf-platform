$apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
$h = @{
    'apikey' = $apiKey
    'Authorization' = "Bearer $apiKey"
}

Write-Host "Comprehensive Duplicate Check - All Players"
Write-Host "==========================================="
Write-Host ""

# Get all rounds
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?select=id,golfer_id,course_name,total_gross,total_stableford,played_at&order=golfer_id,played_at.desc"
$allRounds = Invoke-RestMethod -Uri $url -Headers $h

Write-Host "Total rounds in database: $($allRounds.Count)"

# Group by golfer_id
$playerRounds = $allRounds | Group-Object -Property golfer_id

$playersWithDuplicates = @()
$playersWithManyRounds = @()

foreach ($player in $playerRounds) {
    $rounds = $player.Group
    $golferId = $player.Name

    # Check for duplicates: same date
    $byDate = $rounds | Group-Object -Property {
        if ($_.played_at) { [DateTime]::Parse($_.played_at).ToString('yyyy-MM-dd') } else { 'unknown' }
    }

    $duplicateDates = $byDate | Where-Object { $_.Count -gt 1 }

    if ($duplicateDates.Count -gt 0) {
        # Get player name
        $profileUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?line_user_id=eq.$golferId&select=display_name"
        $profile = Invoke-RestMethod -Uri $profileUrl -Headers $h
        $playerName = if ($profile.display_name) { $profile.display_name } else { $golferId }

        $playersWithDuplicates += @{
            id = $golferId
            name = $playerName
            totalRounds = $rounds.Count
            duplicateDates = $duplicateDates.Count
            duplicateRounds = ($duplicateDates | ForEach-Object { $_.Group })
        }
    }

    # Also flag players with suspiciously many rounds (likely test data)
    if ($rounds.Count -gt 15) {
        $profileUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?line_user_id=eq.$golferId&select=display_name"
        $profile = Invoke-RestMethod -Uri $profileUrl -Headers $h
        $playerName = if ($profile.display_name) { $profile.display_name } else { $golferId }

        $playersWithManyRounds += @{
            id = $golferId
            name = $playerName
            totalRounds = $rounds.Count
        }
    }
}

Write-Host ""
Write-Host "PLAYERS WITH DUPLICATE DATES:"
Write-Host "=============================="
if ($playersWithDuplicates.Count -eq 0) {
    Write-Host "None found!"
} else {
    foreach ($p in $playersWithDuplicates) {
        Write-Host ""
        Write-Host "$($p.name) ($($p.id))"
        Write-Host "  Total rounds: $($p.totalRounds), Duplicate dates: $($p.duplicateDates)"
        foreach ($r in $p.duplicateRounds) {
            $date = if ($r.played_at) { [DateTime]::Parse($r.played_at).ToString('MMM dd HH:mm') } else { 'N/A' }
            Write-Host "    $date | $($r.course_name) | Gross: $($r.total_gross)"
        }
    }
}

Write-Host ""
Write-Host "PLAYERS WITH MANY ROUNDS (>15):"
Write-Host "================================"
if ($playersWithManyRounds.Count -eq 0) {
    Write-Host "None found!"
} else {
    foreach ($p in $playersWithManyRounds) {
        Write-Host "$($p.name) ($($p.id)): $($p.totalRounds) rounds"
    }
}

Write-Host ""
Write-Host "Summary by player:"
Write-Host "=================="
foreach ($player in ($playerRounds | Sort-Object -Property Count -Descending | Select-Object -First 20)) {
    $profileUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?line_user_id=eq.$($player.Name)&select=display_name"
    $profile = Invoke-RestMethod -Uri $profileUrl -Headers $h
    $playerName = if ($profile.display_name) { $profile.display_name } else { $player.Name }
    Write-Host "$playerName : $($player.Count) rounds"
}
