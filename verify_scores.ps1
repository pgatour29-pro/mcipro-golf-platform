$h = @{
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
}

$scorecards = @{
    '29612dfc-19b7-4192-8928-a08f365a604a' = 'Pete Park'
    'd0fa9b75-420a-4b0c-b4bc-8a01187556d7' = 'Alan Thomas'
    'cc508356-e0de-453b-9fed-5972d818b4dd' = 'Tristan Gilbert'
    '1c557583-6c11-4320-8257-eb936feef1af' = 'Ludwig'
}

Write-Host "=== Verified Stableford Totals ===" -ForegroundColor Cyan

foreach ($id in $scorecards.Keys) {
    $url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scores?scorecard_id=eq.$id&select=hole_number,stableford_points"
    $result = Invoke-RestMethod -Uri $url -Headers $h

    $front = ($result | Where-Object { $_.hole_number -le 9 } | Measure-Object -Property stableford_points -Sum).Sum
    $back = ($result | Where-Object { $_.hole_number -gt 9 } | Measure-Object -Property stableford_points -Sum).Sum
    $total = $front + $back

    $name = $scorecards[$id]
    Write-Host "$name : Front=$front, Back=$back, Total=$total"
}
