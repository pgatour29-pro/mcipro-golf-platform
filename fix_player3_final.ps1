$apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
$h = @{
    'apikey' = $apiKey
    'Authorization' = "Bearer $apiKey"
}

$playerId = 'U9e64d5456b0582e81743c87fa48c21e2'

Write-Host "Removing duplicate dates for: $playerId"
Write-Host ""

$roundsUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?golfer_id=eq.$playerId&select=id,course_name,total_gross,total_stableford,played_at&order=played_at.desc"
$rounds = Invoke-RestMethod -Uri $roundsUrl -Headers $h

# Group by date
$byDate = @{}
foreach ($r in $rounds) {
    $dateKey = [DateTime]::Parse($r.played_at).ToString('yyyy-MM-dd')
    if (-not $byDate.ContainsKey($dateKey)) {
        $byDate[$dateKey] = @()
    }
    $byDate[$dateKey] += $r
}

$deleteHeaders = @{
    'apikey' = $apiKey
    'Authorization' = "Bearer $apiKey"
}

$deletedCount = 0
foreach ($dateKey in $byDate.Keys) {
    $dateRounds = $byDate[$dateKey]
    if ($dateRounds.Count -gt 1) {
        Write-Host "Date $dateKey has $($dateRounds.Count) rounds - keeping best stableford"

        # Sort by stableford (highest first) and keep only first
        $sorted = $dateRounds | Sort-Object -Property total_stableford -Descending
        $keep = $sorted[0]
        $toDelete = $sorted | Select-Object -Skip 1

        foreach ($r in $toDelete) {
            $deleteUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?id=eq.$($r.id)"
            Invoke-RestMethod -Uri $deleteUrl -Method Delete -Headers $deleteHeaders
            Write-Host "  Deleted: Gross $($r.total_gross), Pts $($r.total_stableford)"
            $deletedCount++
        }
        Write-Host "  Kept: Gross $($keep.total_gross), Pts $($keep.total_stableford)"
    }
}

Write-Host ""
Write-Host "Deleted $deletedCount duplicate rounds"

# Verify
Write-Host ""
Write-Host "Final rounds:"
$finalRounds = Invoke-RestMethod -Uri $roundsUrl -Headers $h
foreach ($r in $finalRounds) {
    $date = [DateTime]::Parse($r.played_at).ToString('MMM dd')
    Write-Host "  $date | $($r.course_name) | Gross: $($r.total_gross) | Pts: $($r.total_stableford)"
}
Write-Host "Total: $($finalRounds.Count)"
