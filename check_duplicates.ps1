$apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
$h = @{
    'apikey' = $apiKey
    'Authorization' = "Bearer $apiKey"
}

# Get all rounds
Write-Host "Fetching all rounds..."
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?select=id,golfer_id,course_name,total_gross,total_stableford,played_at&order=golfer_id,played_at.desc"
$allRounds = Invoke-RestMethod -Uri $url -Headers $h

Write-Host "Total rounds in database: $($allRounds.Count)"
Write-Host ""

# Group by golfer_id and find duplicates (same date, same gross)
$playerRounds = $allRounds | Group-Object -Property golfer_id

Write-Host "Players with potential duplicates (same date + same gross):"
Write-Host "============================================================"

foreach ($player in $playerRounds) {
    $rounds = $player.Group
    $duplicates = @()

    # Check for duplicates: same date AND same gross score
    $grouped = $rounds | Group-Object -Property {
        $date = if ($_.played_at) { [DateTime]::Parse($_.played_at).ToString('yyyy-MM-dd') } else { 'unknown' }
        "$date|$($_.total_gross)"
    }

    foreach ($g in $grouped) {
        if ($g.Count -gt 1) {
            $duplicates += $g.Group
        }
    }

    if ($duplicates.Count -gt 0) {
        # Get player name from user_profiles
        $profileUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?line_user_id=eq.$($player.Name)&select=display_name"
        $profile = Invoke-RestMethod -Uri $profileUrl -Headers $h
        $playerName = if ($profile.display_name) { $profile.display_name } else { $player.Name }

        Write-Host ""
        Write-Host "Player: $playerName ($($player.Name))"
        Write-Host "Total rounds: $($rounds.Count), Duplicates found: $($duplicates.Count)"
        foreach ($d in $duplicates | Sort-Object played_at -Descending) {
            $date = if ($d.played_at) { [DateTime]::Parse($d.played_at).ToString('MMM dd') } else { 'N/A' }
            Write-Host "  $date | $($d.course_name) | Gross: $($d.total_gross) | Pts: $($d.total_stableford) | ID: $($d.id)"
        }
    }
}
