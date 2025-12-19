$h = @{
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
}

# Check Pete Park's rounds with stableford
$url = 'https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/rounds?golfer_id=eq.U2b6d976f19bca4b2f4374ae0e10ed873&select=id,course_name,total_gross,total_stableford,played_at&order=played_at.desc'
$rounds = Invoke-RestMethod -Uri $url -Headers $h
Write-Host "Pete Park rounds:"
$rounds | ForEach-Object {
    Write-Host "  $($_.played_at.Substring(0,10)) | Gross: $($_.total_gross) | Stableford: $($_.total_stableford) | $($_.course_name)"
}

Write-Host ""
Write-Host "Stats calculation:"
$validRounds = $rounds | Where-Object { $_.total_gross -ge 50 }
Write-Host "  Total valid rounds (gross >= 50): $($validRounds.Count)"
$avgGross = ($validRounds | Measure-Object -Property total_gross -Average).Average
$avgStableford = ($validRounds | Measure-Object -Property total_stableford -Average).Average
$bestStableford = ($validRounds | Measure-Object -Property total_stableford -Maximum).Maximum
Write-Host "  Avg Gross: $([math]::Round($avgGross, 1))"
Write-Host "  Avg Stableford: $([math]::Round($avgStableford, 1))"
Write-Host "  Best Stableford: $bestStableford"
