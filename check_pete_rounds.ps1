$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk"
}

$peteLineId = "U2b6d976f19bca4b2f4374ae0e10ed873"

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "=== PETE PARK - ALL ROUNDS WITH DETAILS ===" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?golfer_id=eq.$peteLineId&select=id,course_name,total_gross,total_stableford,holes_played,course_rating,slope_rating,played_at,status&order=played_at.desc"
$rounds = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

Write-Host "Total rounds: $($rounds.Count)"
Write-Host ""
Write-Host "Date       | Course                    | Gross | Stblfd | Holes | CR    | Slope | Status"
Write-Host "-----------|---------------------------|-------|--------|-------|-------|-------|--------"

$rounds | ForEach-Object {
    $date = if ($_.played_at) { $_.played_at.Substring(0,10) } else { "N/A       " }
    $course = if ($_.course_name) { $_.course_name.PadRight(25).Substring(0,25) } else { "Unknown".PadRight(25) }
    $gross = if ($_.total_gross) { $_.total_gross.ToString().PadLeft(5) } else { "N/A".PadLeft(5) }
    $stab = if ($_.total_stableford) { $_.total_stableford.ToString().PadLeft(6) } else { "N/A".PadLeft(6) }
    $holes = if ($_.holes_played) { $_.holes_played.ToString().PadLeft(5) } else { "?".PadLeft(5) }
    $cr = if ($_.course_rating) { $_.course_rating.ToString().PadLeft(5) } else { "?".PadLeft(5) }
    $slope = if ($_.slope_rating) { $_.slope_rating.ToString().PadLeft(5) } else { "?".PadLeft(5) }
    $status = if ($_.status) { $_.status } else { "?" }
    Write-Host "$date | $course | $gross | $stab | $holes | $cr | $slope | $status"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "=== ANALYZING HANDICAP CALCULATION ===" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

# Filter 18-hole rounds
$valid18 = $rounds | Where-Object { $_.holes_played -eq 18 -and $_.total_gross -gt 0 }
Write-Host "18-hole rounds with scores: $($valid18.Count)"

# Calculate differentials
$diffs = @()
$valid18 | ForEach-Object {
    if ($_.course_rating -and $_.slope_rating -and $_.total_gross) {
        # WHS Differential = (Score - Course Rating) x 113 / Slope Rating
        $diff = ($_.total_gross - $_.course_rating) * 113 / $_.slope_rating
        $diffs += [PSCustomObject]@{
            Date = $_.played_at.Substring(0,10)
            Course = $_.course_name
            Gross = $_.total_gross
            CR = $_.course_rating
            Slope = $_.slope_rating
            Differential = [math]::Round($diff, 1)
        }
    }
}

Write-Host ""
Write-Host "Calculated Differentials:"
$diffs | Sort-Object Differential | ForEach-Object {
    Write-Host "  $($_.Date) | $($_.Course.Substring(0, [Math]::Min(20, $_.Course.Length)).PadRight(20)) | Gross: $($_.Gross) | Diff: $($_.Differential)"
}

if ($diffs.Count -ge 3) {
    $sortedDiffs = $diffs | Sort-Object Differential
    $bestDiff = $sortedDiffs[0].Differential
    Write-Host ""
    Write-Host "Best differential (used for 3-19 rounds): $bestDiff" -ForegroundColor Green
    Write-Host "This should be Pete's handicap index!" -ForegroundColor Green
}
