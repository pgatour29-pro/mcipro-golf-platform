$h = @{
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
}

# Pete's December scorecards
$scorecards = @(
    @{id='29612dfc-19b7-4192-8928-a08f365a604a'; date='Dec 13'; course='Greenwood C+B'; gross=77},
    @{id='832f5df3-85a4-4bf7-b4f8-313df229514a'; date='Dec 12'; course='Mountain Shadow'; gross=81},
    @{id='c7b1287a-fe0e-4a52-a338-afe385c67443'; date='Dec 9'; course='Bangpakong'; gross=74},
    @{id='dc402c80-fa2c-4b61-9644-169cd69eb9a4'; date='Dec 8'; course='Eastern Star'; gross=75},
    @{id='ba2cb178-7d5e-47cf-963c-d2ddaacf5bda'; date='Dec 6'; course='Plutaluang'; gross=83},
    @{id='54c0b85e-831e-4dc9-8217-c6789639a304'; date='Dec 5'; course='Treasure Hill'; gross=73}
)

foreach ($sc in $scorecards) {
    $url = "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scores?scorecard_id=eq.$($sc.id)&select=stableford_points"
    $scores = Invoke-RestMethod -Uri $url -Headers $h
    $total = ($scores | Measure-Object -Property stableford_points -Sum).Sum
    Write-Host "$($sc.date) | $($sc.course) | Gross: $($sc.gross) | Stableford: $total"
}
