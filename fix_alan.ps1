$apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
$h = @{
    'apikey' = $apiKey
    'Authorization' = "Bearer $apiKey"
    'Content-Type' = 'application/json'
    'Prefer' = 'return=representation'
}

$alanId = 'U214f2fe47e1681fbb26f0aba95930d64'

# Step 1: Count current rounds
Write-Host "Step 1: Current Alan Thomas rounds..."
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?golfer_id=eq.$alanId&select=id"
$current = Invoke-RestMethod -Uri $url -Headers $h
Write-Host "Current rounds: $($current.Count)"

# Step 2: Delete ALL Alan's rounds
Write-Host ""
Write-Host "Step 2: Deleting all Alan Thomas rounds..."
$deleteUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?golfer_id=eq.$alanId"
$deleteHeaders = @{
    'apikey' = $apiKey
    'Authorization' = "Bearer $apiKey"
}
try {
    Invoke-RestMethod -Uri $deleteUrl -Method Delete -Headers $deleteHeaders
    Write-Host "Deleted all Alan Thomas rounds"
} catch {
    Write-Host "Error deleting: $_"
}

# Step 3: Insert ONLY verified rounds from society events
Write-Host ""
Write-Host "Step 3: Inserting verified rounds..."

$rounds = @(
    # Dec 13: Greenwood - 86 gross, 33 pts (VERIFIED)
    @{golfer_id=$alanId; course_name='Greenwood Golf and Resort (C+B)'; total_gross=86; total_stableford=33; type='society'; played_at='2025-12-13T01:26:41+00:00'},
    # Dec 12: Mountain Shadow - 87 gross, 32 pts (VERIFIED)
    @{golfer_id=$alanId; course_name='Mountain Shadow Golf Club'; total_gross=87; total_stableford=32; type='society'; played_at='2025-12-12T02:34:35+00:00'},
    # Dec 09: Bangpakong - 79 gross, 41 pts (VERIFIED)
    @{golfer_id=$alanId; course_name='Bangpakong Riverside Country Club'; total_gross=79; total_stableford=41; type='society'; played_at='2025-12-09T02:56:37+00:00'},
    # Dec 08: Eastern Star - 86 gross, 34 pts (VERIFIED)
    @{golfer_id=$alanId; course_name='Eastern Star Golf Course'; total_gross=86; total_stableford=34; type='society'; played_at='2025-12-08T02:49:26+00:00'},
    # Dec 05: Treasure Hill - 84 gross, 29 pts (VERIFIED)
    @{golfer_id=$alanId; course_name='Treasure Hill Golf and Country Club'; total_gross=84; total_stableford=29; type='society'; played_at='2025-12-05T05:14:45+00:00'}
)

$insertUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds"
$body = $rounds | ConvertTo-Json

try {
    $result = Invoke-RestMethod -Uri $insertUrl -Method Post -Headers $h -Body $body
    Write-Host "Inserted $($rounds.Count) verified rounds"
} catch {
    Write-Host "Error inserting: $_"
}

# Step 4: Verify
Write-Host ""
Write-Host "Step 4: Verifying Alan Thomas rounds..."
$verifyUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?golfer_id=eq.$alanId&select=course_name,total_gross,total_stableford,played_at&order=played_at.desc"
$finalRounds = Invoke-RestMethod -Uri $verifyUrl -Headers $h

Write-Host ""
Write-Host "Alan Thomas Verified Rounds:"
Write-Host "============================="
foreach ($r in $finalRounds) {
    $date = [DateTime]::Parse($r.played_at).ToString('MMM dd')
    Write-Host "$date | $($r.course_name) | Gross: $($r.total_gross) | Pts: $($r.total_stableford)"
}

Write-Host ""
Write-Host "Stats Summary:"
Write-Host "=============="
$totalRounds = $finalRounds.Count
$avgGross = [math]::Round(($finalRounds | Measure-Object -Property total_gross -Average).Average, 1)
$bestGross = ($finalRounds | Measure-Object -Property total_gross -Minimum).Minimum
$avgStableford = [math]::Round(($finalRounds | Measure-Object -Property total_stableford -Average).Average, 1)
$bestStableford = ($finalRounds | Measure-Object -Property total_stableford -Maximum).Maximum

Write-Host "Total Rounds: $totalRounds"
Write-Host "Avg Gross: $avgGross"
Write-Host "Best Gross: $bestGross"
Write-Host "Avg Stableford: $avgStableford"
Write-Host "Best Stableford: $bestStableford"
