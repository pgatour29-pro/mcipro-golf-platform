$apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
$h = @{
    'apikey' = $apiKey
    'Authorization' = "Bearer $apiKey"
    'Content-Type' = 'application/json'
    'Prefer' = 'return=representation'
}

$peteId = 'U2b6d976f19bca4b2f4374ae0e10ed873'

# Step 1: Count current rounds
Write-Host "Step 1: Current Pete Park rounds count..."
$url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?golfer_id=eq.$peteId&select=id"
$current = Invoke-RestMethod -Uri $url -Headers $h
Write-Host "Current rounds: $($current.Count)"

# Step 2: Delete ALL Pete Park's rounds
Write-Host ""
Write-Host "Step 2: Deleting all Pete Park rounds..."
$deleteUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?golfer_id=eq.$peteId"
$deleteHeaders = @{
    'apikey' = $apiKey
    'Authorization' = "Bearer $apiKey"
}
try {
    Invoke-RestMethod -Uri $deleteUrl -Method Delete -Headers $deleteHeaders
    Write-Host "Deleted all Pete Park rounds"
} catch {
    Write-Host "Error deleting: $_"
}

# Step 3: Insert verified rounds
Write-Host ""
Write-Host "Step 3: Inserting verified rounds..."

$rounds = @(
    @{golfer_id=$peteId; course_name='Greenwood Golf and Resort (C+B)'; total_gross=77; total_stableford=34; type='society'; played_at='2025-12-13T01:26:41.477+00:00'},
    @{golfer_id=$peteId; course_name='Mountain Shadow Golf Club'; total_gross=81; total_stableford=30; type='society'; played_at='2025-12-12T02:34:35.623+00:00'},
    @{golfer_id=$peteId; course_name='Bangpakong Riverside Country Club'; total_gross=74; total_stableford=38; type='society'; played_at='2025-12-09T02:56:37.124+00:00'},
    @{golfer_id=$peteId; course_name='Eastern Star Golf Course'; total_gross=75; total_stableford=38; type='society'; played_at='2025-12-08T02:49:26.129+00:00'},
    @{golfer_id=$peteId; course_name='Plutaluang Navy Golf Course'; total_gross=83; total_stableford=29; type='society'; played_at='2025-12-06T03:30:23.379+00:00'},
    @{golfer_id=$peteId; course_name='Treasure Hill Golf and Country Club'; total_gross=73; total_stableford=33; type='society'; played_at='2025-12-05T05:14:45.068+00:00'},
    @{golfer_id=$peteId; course_name='Society Event'; total_gross=75; total_stableford=36; type='society'; played_at='2025-11-13T02:34:22.592+00:00'},
    @{golfer_id=$peteId; course_name='Society Event'; total_gross=80; total_stableford=30; type='society'; played_at='2025-11-11T02:17:30.684+00:00'},
    @{golfer_id=$peteId; course_name='Society Event'; total_gross=77; total_stableford=33; type='society'; played_at='2025-11-08T03:28:33.609+00:00'},
    @{golfer_id=$peteId; course_name='Society Event'; total_gross=71; total_stableford=39; type='society'; played_at='2025-11-07T03:02:44.725+00:00'},
    @{golfer_id=$peteId; course_name='Society Event'; total_gross=84; total_stableford=27; type='society'; played_at='2025-11-05T04:24:18.495+00:00'}
)

$insertUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds"
$body = $rounds | ConvertTo-Json

try {
    $result = Invoke-RestMethod -Uri $insertUrl -Method Post -Headers $h -Body $body
    Write-Host "Inserted $($rounds.Count) rounds successfully"
} catch {
    Write-Host "Error inserting: $_"
    Write-Host $_.Exception.Response
}

# Step 4: Verify
Write-Host ""
Write-Host "Step 4: Verifying Pete Park rounds..."
$verifyUrl = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?golfer_id=eq.$peteId&select=course_name,total_gross,total_stableford,played_at&order=played_at.desc"
$finalRounds = Invoke-RestMethod -Uri $verifyUrl -Headers $h

Write-Host ""
Write-Host "Pete Park's Verified Rounds:"
Write-Host "============================="
foreach ($r in $finalRounds) {
    $date = [DateTime]::Parse($r.played_at).ToString('MMM dd')
    Write-Host "$date | $($r.course_name) | Gross: $($r.total_gross) | Stableford: $($r.total_stableford)"
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
