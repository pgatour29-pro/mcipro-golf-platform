$apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
$h = @{
    'apikey' = $apiKey
    'Authorization' = "Bearer $apiKey"
}

Write-Host "CLEANING INVALID ROUNDS"
Write-Host "======================="
Write-Host ""

# Get all rounds
$roundsUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?select=id,golfer_id,course_name,total_gross,total_stableford,played_at"
$allRounds = Invoke-RestMethod -Uri $roundsUrl -Headers $h

$deleteHeaders = @{
    'apikey' = $apiKey
    'Authorization' = "Bearer $apiKey"
}

$deleted = 0

foreach ($r in $allRounds) {
    $invalid = $false
    $reason = ""

    # Check gross score
    if ($r.total_gross -lt 60) {
        $invalid = $true
        $reason = "Gross too low ($($r.total_gross))"
    }
    if ($r.total_gross -gt 130) {
        $invalid = $true
        $reason = "Gross too high ($($r.total_gross))"
    }

    # Check stableford
    if ($r.total_stableford -gt 54) {
        $invalid = $true
        $reason = "Stableford impossible ($($r.total_stableford))"
    }

    if ($invalid) {
        # Get player name
        $profileUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?line_user_id=eq.$($r.golfer_id)&select=display_name"
        $profile = Invoke-RestMethod -Uri $profileUrl -Headers $h
        $playerName = if ($profile.display_name) { $profile.display_name } else { $r.golfer_id }

        Write-Host "Deleting: $playerName | $($r.course_name) | Gross: $($r.total_gross) | Pts: $($r.total_stableford) | Reason: $reason"

        $deleteUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?id=eq.$($r.id)"
        Invoke-RestMethod -Uri $deleteUrl -Method Delete -Headers $deleteHeaders
        $deleted++
    }
}

Write-Host ""
Write-Host "Deleted $deleted invalid rounds"

# Verify
Write-Host ""
Write-Host "VERIFICATION AFTER CLEANUP:"
$finalRounds = Invoke-RestMethod -Uri $roundsUrl -Headers $h
Write-Host "Total rounds remaining: $($finalRounds.Count)"

$stillInvalid = $finalRounds | Where-Object { $_.total_gross -lt 60 -or $_.total_gross -gt 130 -or $_.total_stableford -gt 54 }
if ($stillInvalid.Count -eq 0) {
    Write-Host "All rounds now valid"
} else {
    Write-Host "Still have $($stillInvalid.Count) invalid rounds"
}
