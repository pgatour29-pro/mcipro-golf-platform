$apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
$h = @{
    'apikey' = $apiKey
    'Authorization' = "Bearer $apiKey"
}

$playerId = 'U9e64d5456b0582e81743c87fa48c21e2'

Write-Host "Cleaning up test account: $playerId"
Write-Host ""

# Delete rounds with unrealistic scores (gross < 60 or stableford > 54)
$roundsUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?golfer_id=eq.$playerId&select=id,course_name,total_gross,total_stableford,played_at"
$rounds = Invoke-RestMethod -Uri $roundsUrl -Headers $h

Write-Host "Current rounds: $($rounds.Count)"

$deleteHeaders = @{
    'apikey' = $apiKey
    'Authorization' = "Bearer $apiKey"
}

$keptCount = 0
$deletedCount = 0

foreach ($r in $rounds) {
    $isValid = ($r.total_gross -ge 60) -and ($r.total_gross -le 120) -and ($r.total_stableford -le 54)

    if (-not $isValid) {
        # Delete this round
        $deleteUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?id=eq.$($r.id)"
        Invoke-RestMethod -Uri $deleteUrl -Method Delete -Headers $deleteHeaders
        $date = if ($r.played_at) { [DateTime]::Parse($r.played_at).ToString('MMM dd') } else { 'N/A' }
        Write-Host "Deleted: $date | Gross: $($r.total_gross) | Pts: $($r.total_stableford)"
        $deletedCount++
    } else {
        $keptCount++
    }
}

Write-Host ""
Write-Host "Deleted: $deletedCount"
Write-Host "Kept: $keptCount"

# Verify final state
Write-Host ""
Write-Host "Final rounds:"
$finalRounds = Invoke-RestMethod -Uri $roundsUrl -Headers $h
foreach ($r in $finalRounds) {
    $date = if ($r.played_at) { [DateTime]::Parse($r.played_at).ToString('MMM dd') } else { 'N/A' }
    Write-Host "  $date | $($r.course_name) | Gross: $($r.total_gross) | Pts: $($r.total_stableford)"
}
Write-Host "Total: $($finalRounds.Count)"
