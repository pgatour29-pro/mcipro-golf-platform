$apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
$h = @{
    'apikey' = $apiKey
    'Authorization' = "Bearer $apiKey"
}

Write-Host "FULL DATABASE VERIFICATION - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
Write-Host "=============================================================="
Write-Host ""

# Get all rounds grouped by player
$roundsUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?select=id,golfer_id,course_name,total_gross,total_stableford,played_at&order=golfer_id,played_at.desc"
$allRounds = Invoke-RestMethod -Uri $roundsUrl -Headers $h

$byPlayer = $allRounds | Group-Object -Property golfer_id

Write-Host "Total rounds in database: $($allRounds.Count)"
Write-Host "Total players with rounds: $($byPlayer.Count)"
Write-Host ""

$output = @()

foreach ($player in ($byPlayer | Sort-Object -Property { $_.Group.Count } -Descending)) {
    $golferId = $player.Name
    $rounds = $player.Group

    # Get player name
    $profileUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?line_user_id=eq.$golferId&select=display_name"
    $profile = Invoke-RestMethod -Uri $profileUrl -Headers $h
    $playerName = if ($profile.display_name) { $profile.display_name } else { $golferId }

    # Calculate stats
    $totalRounds = $rounds.Count
    $avgGross = [math]::Round(($rounds | Measure-Object -Property total_gross -Average).Average, 1)
    $bestGross = ($rounds | Measure-Object -Property total_gross -Minimum).Minimum
    $avgStableford = [math]::Round(($rounds | Measure-Object -Property total_stableford -Average).Average, 1)
    $bestStableford = ($rounds | Measure-Object -Property total_stableford -Maximum).Maximum

    # Check for duplicates
    $byDate = $rounds | Group-Object -Property { [DateTime]::Parse($_.played_at).ToString('yyyy-MM-dd') }
    $duplicates = ($byDate | Where-Object { $_.Count -gt 1 }).Count

    # Check for invalid data
    $invalidGross = ($rounds | Where-Object { $_.total_gross -lt 60 -or $_.total_gross -gt 120 }).Count
    $invalidStableford = ($rounds | Where-Object { $_.total_stableford -gt 54 }).Count

    $status = "OK"
    if ($duplicates -gt 0) { $status = "DUPLICATES" }
    if ($invalidGross -gt 0) { $status = "BAD GROSS" }
    if ($invalidStableford -gt 0) { $status = "BAD STABLEFORD" }

    Write-Host "$playerName"
    Write-Host "  Rounds: $totalRounds | Avg: $avgGross | Best: $bestGross | Avg Pts: $avgStableford | Best Pts: $bestStableford | Status: $status"

    if ($status -ne "OK") {
        Write-Host "  WARNING: $status"
    }

    $output += [PSCustomObject]@{
        Player = $playerName
        ID = $golferId
        Rounds = $totalRounds
        AvgGross = $avgGross
        BestGross = $bestGross
        AvgStableford = $avgStableford
        BestStableford = $bestStableford
        Status = $status
    }
}

Write-Host ""
Write-Host "=============================================================="
Write-Host "SUMMARY"
Write-Host "=============================================================="

$issues = $output | Where-Object { $_.Status -ne "OK" }
if ($issues.Count -eq 0) {
    Write-Host "All players OK - no duplicates or invalid data"
} else {
    Write-Host "Players with issues: $($issues.Count)"
    foreach ($i in $issues) {
        Write-Host "  - $($i.Player): $($i.Status)"
    }
}
