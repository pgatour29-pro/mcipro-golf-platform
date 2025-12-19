$apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk'
$baseUrl = 'https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/scores'

$headers = @{
    'apikey' = $apiKey
    'Authorization' = "Bearer $apiKey"
    'Content-Type' = 'application/json'
    'Prefer' = 'return=minimal'
}

# Pete Park scorecard: 29612dfc-19b7-4192-8928-a08f365a604a
# Expected: 16 front + 18 back = 34 total
$peteParkScores = @{
    1 = 2; 2 = 2; 3 = 1; 4 = 2; 5 = 1; 6 = 2; 7 = 2; 8 = 1; 9 = 3;
    10 = 3; 11 = 2; 12 = 2; 13 = 0; 14 = 2; 15 = 2; 16 = 2; 17 = 3; 18 = 2
}

# Alan Thomas scorecard: d0fa9b75-420a-4b0c-b4bc-8a01187556d7
# Expected: 16 front + 17 back = 33 total
$alanThomasScores = @{
    1 = 2; 2 = 2; 3 = 1; 4 = 2; 5 = 2; 6 = 1; 7 = 2; 8 = 2; 9 = 2;
    10 = 2; 11 = 1; 12 = 2; 13 = 3; 14 = 2; 15 = 1; 16 = 0; 17 = 4; 18 = 2
}

# Tristan Gilbert scorecard: cc508356-e0de-453b-9fed-5972d818b4dd
# Expected: 13 front + 13 back = 26 total
$tristanScores = @{
    1 = 2; 2 = 0; 3 = 0; 4 = 1; 5 = 2; 6 = 1; 7 = 0; 8 = 3; 9 = 4;
    10 = 0; 11 = 3; 12 = 2; 13 = 3; 14 = 1; 15 = 1; 16 = 0; 17 = 1; 18 = 2
}

function Update-PlayerScores {
    param (
        [string]$scorecardId,
        [string]$playerName,
        [hashtable]$scores
    )

    Write-Host "Updating $playerName ($scorecardId)..."

    foreach ($hole in 1..18) {
        $points = $scores[$hole]
        $url = "$baseUrl`?scorecard_id=eq.$scorecardId&hole_number=eq.$hole"
        $body = @{ stableford_points = $points } | ConvertTo-Json

        try {
            Invoke-RestMethod -Uri $url -Method PATCH -Headers $headers -Body $body
            Write-Host "  Hole $hole = $points pts"
        } catch {
            Write-Host "  ERROR on hole $hole : $_" -ForegroundColor Red
        }
    }

    # Calculate totals
    $front = 0
    $back = 0
    foreach ($h in 1..9) { $front += $scores[$h] }
    foreach ($h in 10..18) { $back += $scores[$h] }
    Write-Host "$playerName : Front=$front, Back=$back, Total=$($front + $back)" -ForegroundColor Green
}

Write-Host "=== Fixing Greenwood Dec 13 Stableford Points ===" -ForegroundColor Cyan

Update-PlayerScores -scorecardId "29612dfc-19b7-4192-8928-a08f365a604a" -playerName "Pete Park" -scores $peteParkScores
Update-PlayerScores -scorecardId "d0fa9b75-420a-4b0c-b4bc-8a01187556d7" -playerName "Alan Thomas" -scores $alanThomasScores
Update-PlayerScores -scorecardId "cc508356-e0de-453b-9fed-5972d818b4dd" -playerName "Tristan Gilbert" -scores $tristanScores

Write-Host "`n=== Done! ===" -ForegroundColor Cyan
