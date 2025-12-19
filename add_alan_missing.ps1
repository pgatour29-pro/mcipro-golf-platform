$apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
$h = @{
    'apikey' = $apiKey
    'Authorization' = "Bearer $apiKey"
    'Content-Type' = 'application/json'
    'Prefer' = 'return=representation'
}

$alanId = 'U214f2fe47e1681fbb26f0aba95930d64'

Write-Host "Adding missing Dec 3 Bangpakong round for Alan Thomas..."
Write-Host ""

# Insert the missing round
$round = @{
    golfer_id = $alanId
    course_name = 'Bangpakong Riverside Country Club'
    total_gross = 76
    total_stableford = 44
    type = 'society'
    played_at = '2025-12-03T08:52:00+00:00'
}

$insertUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds"
$body = "[$($round | ConvertTo-Json)]"

try {
    $result = Invoke-RestMethod -Uri $insertUrl -Method Post -Headers $h -Body $body
    Write-Host "Added Dec 3 Bangpakong round: Gross 76, Stableford 44"
} catch {
    Write-Host "Error: $_"
}

# Verify
Write-Host ""
Write-Host "Alan Thomas - Updated rounds:"
Write-Host "=============================="
$roundsUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?golfer_id=eq.$alanId&select=course_name,total_gross,total_stableford,played_at&order=played_at.desc"
$rounds = Invoke-RestMethod -Uri $roundsUrl -Headers $h

foreach ($r in $rounds) {
    $date = [DateTime]::Parse($r.played_at).ToString('MMM dd')
    Write-Host "$date | $($r.course_name) | Gross: $($r.total_gross) | Pts: $($r.total_stableford)"
}

Write-Host ""
Write-Host "Total rounds: $($rounds.Count)"

# Calculate stats
$avgGross = [math]::Round(($rounds | Measure-Object -Property total_gross -Average).Average, 1)
$bestGross = ($rounds | Measure-Object -Property total_gross -Minimum).Minimum
$avgStableford = [math]::Round(($rounds | Measure-Object -Property total_stableford -Average).Average, 1)
$bestStableford = ($rounds | Measure-Object -Property total_stableford -Maximum).Maximum

Write-Host ""
Write-Host "Stats:"
Write-Host "  Avg Gross: $avgGross"
Write-Host "  Best Gross: $bestGross"
Write-Host "  Avg Stableford: $avgStableford"
Write-Host "  Best Stableford: $bestStableford"
